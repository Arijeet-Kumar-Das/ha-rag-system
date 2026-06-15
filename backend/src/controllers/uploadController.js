import { extractTextFromPDF } from "../utils/pdfParser.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";
import { chunkText } from "../utils/chunkText.js";
import { annotateChunksWithPageMetadata } from "../utils/chunkAnnotator.js";
import { mergeFigureDescriptions } from "../utils/figureTextMerger.js";
import { mergeTableDescriptions } from "../utils/tableTextMerger.js";
import { extractFigures } from "../services/figureService.js";
import { extractTables } from "../services/tableService.js";
import { generateEmbedding } from "../services/embeddingService.js";
import { getIndex } from "../services/vectorService.js";
import { randomUUID } from "crypto";
import Chunk from "../models/Chunk.js";
import Document from "../models/Document.js";
import Figure from "../models/Figure.js";
import Table from "../models/Table.js";
import Workspace from "../models/Workspace.js";

const FIGURE_UNDERSTANDING_ENABLED =
    process.env.FIGURE_UNDERSTANDING_ENABLED === "true";
const TABLE_UNDERSTANDING_ENABLED =
    process.env.TABLE_UNDERSTANDING_ENABLED === "true";

export const uploadPDF = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "File is required" });
        }

        // With memoryStorage, the file buffer is available directly
        const pdfBuffer = req.file.buffer;
        const fileName = req.file.originalname;
        const { workspaceId } = req.body;

        console.log(`[UPLOAD] File received: ${fileName} (${pdfBuffer.length} bytes)`);

        const index = getIndex();
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        const userId = req.user._id.toString();
        const DOC_LIMIT = process.env.MAX_DOCUMENTS_PER_USER
            ? parseInt(process.env.MAX_DOCUMENTS_PER_USER)
            : 10;

        // ── 1. Storage Limiting & Duplicate Handling ──────────────────────
        const existingDoc = await Document.findOne({ fileName, userId });
        if (existingDoc) {
            console.log(
                `[UPLOAD] Duplicate found for ${fileName}. Deleting old namespace ${existingDoc.namespace}.`
            );
            try {
                await index.namespace(existingDoc.namespace).deleteAll();
            } catch (e) {}
            await Chunk.deleteMany({ namespace: existingDoc.namespace });
            await Figure.deleteMany({ namespace: existingDoc.namespace });
            await Table.deleteMany({ namespace: existingDoc.namespace });
            await Document.deleteOne({ namespace: existingDoc.namespace });
            await Workspace.updateMany({ userId }, { $pull: { documentIds: existingDoc._id } });
        }

        const userDocsCount = await Document.countDocuments({ userId });
        if (userDocsCount >= DOC_LIMIT) {
            console.log(
                `[UPLOAD] Storage limit reached (${DOC_LIMIT}). Deleting oldest document.`
            );
            const oldestDoc = await Document.findOne({ userId }).sort({
                uploadDate: 1,
            });
            if (oldestDoc) {
                try {
                    await index.namespace(oldestDoc.namespace).deleteAll();
                } catch (e) {}
                await Chunk.deleteMany({ namespace: oldestDoc.namespace });
                await Figure.deleteMany({ namespace: oldestDoc.namespace });
                await Table.deleteMany({ namespace: oldestDoc.namespace });
                await Document.deleteOne({ namespace: oldestDoc.namespace });
                await Workspace.updateMany({ userId }, { $pull: { documentIds: oldestDoc._id } });
            }
        }

        const documentId = randomUUID();

        // ── 2. Extract text with OCR fallback ────────────────────────────
        const { fullText, pages, stats } = await extractTextFromPDF(pdfBuffer);

        console.log(
            `[UPLOAD] Extraction complete — ${stats.totalPages} pages: ` +
                `${stats.textPages} text, ${stats.ocrPages} OCR, ${stats.failedPages} failed`
        );
        console.log("[UPLOAD] Full text length:", fullText.length);

        if (!fullText || fullText.trim().length === 0) {
            return res.status(400).json({
                error: "No readable text found in PDF (text extraction and OCR both failed)",
            });
        }

        // ── 3. Figure understanding (optional) ───────────────────────────
        let figures = [];
        let figureStats = null;

        if (FIGURE_UNDERSTANDING_ENABLED) {
            try {
                console.log("[UPLOAD] Figure understanding enabled — analysing...");
                const figureResult = await extractFigures(pdfBuffer, pages);
                figures = figureResult.figures;
                figureStats = figureResult.stats;
                console.log(
                    `[UPLOAD] Figures: ${figures.length} found across ` +
                        `${figureStats.pagesWithFigures} page(s)`
                );
            } catch (figErr) {
                // Figure extraction failure is non-fatal — continue with text-only pipeline
                console.error(
                    "[UPLOAD] ⚠️ Figure extraction failed (non-fatal):",
                    figErr.message
                );
            }
        }

        // ── 3b. Table understanding (optional) ──────────────────────────
        let tables = [];
        let tableStats = null;

        if (TABLE_UNDERSTANDING_ENABLED) {
            try {
                console.log("[UPLOAD] Table understanding enabled — analysing...");
                const tableResult = await extractTables(pdfBuffer, pages);
                tables = tableResult.tables;
                tableStats = tableResult.stats;
                console.log(
                    `[UPLOAD] Tables: ${tables.length} found across ` +
                        `${tableStats.pagesWithTables} page(s)`
                );
            } catch (tblErr) {
                // Table extraction failure is non-fatal — continue with existing pipeline
                console.error(
                    "[UPLOAD] ⚠️ Table extraction failed (non-fatal):",
                    tblErr.message
                );
            }
        }

        // ── 4. Merge figure descriptions into text ───────────────────────
        const { enrichedText, enrichedPages } = mergeFigureDescriptions(
            fullText,
            pages,
            figures
        );

        // ── 4b. Merge table descriptions into text ──────────────────────
        const { enrichedText: finalText, enrichedPages: finalPages } =
            mergeTableDescriptions(enrichedText, enrichedPages, tables);

        // Determine overall document extraction method
        const methodSet = new Set();
        if (stats.textPages > 0) methodSet.add("text");
        if (stats.ocrPages > 0) methodSet.add("ocr");
        if (figures.length > 0) methodSet.add("figure");
        if (tables.length > 0) methodSet.add("table");

        const extractionMethod =
            methodSet.size > 1
                ? "mixed"
                : methodSet.values().next().value || "text";

        // ── 5. Page-aware chunking (OCR isolation) ─────────────────────
        //
        // OCR pages get dedicated chunks so their content is never diluted
        // into large text-heavy chunks.  Text pages are chunked normally.
        //
        const ocrPages = finalPages.filter((p) => p.isOcrPage || p.method === "ocr");
        const textPages = finalPages.filter((p) => !p.isOcrPage && p.method !== "ocr");

        // 5a. Chunk text pages normally
        const textContent = textPages.map((p) => p.text).join("\n");
        const textChunks = textContent.trim() ? chunkText(textContent) : [];

        // 5b. Create dedicated chunks for OCR pages (one per page, or split if huge)
        const ocrChunks = [];
        for (const page of ocrPages) {
            const pageText = (page.text || "").trim();
            if (!pageText) continue;

            const wordCount = pageText.split(/\s+/).length;
            if (wordCount > 400) {
                // Very large OCR page — split it, but keep OCR metadata
                const subChunks = chunkText(pageText);
                for (const sc of subChunks) {
                    sc.metadata = {
                        ...sc.metadata,
                        extractionMethod: "ocr",
                        ocrConfidence: page.confidence,
                        sourcePages: [page.pageNumber],
                        isOcrChunk: true,
                    };
                    ocrChunks.push(sc);
                }
            } else {
                // Standard OCR page — one dedicated chunk
                ocrChunks.push({
                    content: pageText,
                    metadata: {
                        chunkIndex: 0,
                        extractionMethod: "ocr",
                        ocrConfidence: page.confidence,
                        sourcePages: [page.pageNumber],
                        isOcrChunk: true,
                    },
                });
            }

            console.log(
                `[OCR-CHUNK] Page ${page.pageNumber}: dedicated chunk created ` +
                    `(${wordCount} words, confidence: ${page.confidence?.toFixed(1) ?? "N/A"}%)`
            );
        }

        // 5c. Annotate text chunks with page + figure + table metadata
        // OCR chunks already have their metadata pre-set; annotate only text chunks
        annotateChunksWithPageMetadata(textChunks, finalPages, figures, tables);

        // 5d. Merge text and OCR chunks
        const chunks = [...textChunks, ...ocrChunks];

        // 5e. Sort chunks to preserve original document page ordering
        chunks.sort((a, b) => {
            const pageA = a.metadata?.sourcePages?.[0] ?? 0;
            const pageB = b.metadata?.sourcePages?.[0] ?? 0;
            return pageA - pageB;
        });

        // 5f. Re-index all chunks with sequential chunkIndex in page order
        chunks.forEach((c, i) => {
            c.metadata = { ...c.metadata, chunkIndex: i };
        });

        console.log(
            `[UPLOAD] Chunks: ${chunks.length} total ` +
                `(${textChunks.length} from text, ${ocrChunks.length} from OCR pages)`
        );

        if (!chunks || chunks.length === 0) {
            return res.status(400).json({ error: "Chunking failed" });
        }

        const methodCounts = chunks.reduce((acc, c) => {
            const m = c.metadata?.extractionMethod || "text";
            acc[m] = (acc[m] || 0) + 1;
            return acc;
        }, {});
        const breakdown = Object.entries(methodCounts)
            .map(([m, n]) => `${n} ${m}`)
            .join(", ");
        console.log(`[UPLOAD] Chunk extraction breakdown: ${breakdown}`);

        // ── 6. Generate embeddings in parallel batches ───────────────────
        const vectors = [];
        console.time("Embeddings Generation");
        const BATCH_SIZE = 5;

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (chunkObj, indexInBatch) => {
                const globalIndex = i + indexInBatch;
                const chunk = chunkObj.content.trim();

                if (!chunk) return;

                try {
                    const embedding = await generateEmbedding(chunk);

                    if (!Array.isArray(embedding) || embedding.length === 0)
                        return;

                    vectors.push({
                        id: randomUUID(),
                        values: embedding,
                        metadata: {
                            text: chunk,
                            chunkIndex: globalIndex,
                            fileName: fileName,
                            namespace: documentId,
                            userId,
                            extractionMethod:
                                chunkObj.metadata?.extractionMethod || "text",
                            hasFigureContent:
                                chunkObj.metadata?.hasFigureContent || false,
                            hasTableContent:
                                chunkObj.metadata?.hasTableContent || false,
                        },
                    });
                } catch (err) {
                    console.error(
                        `Embedding failed for chunk ${globalIndex}:`,
                        err.message
                    );
                }
            });

            await Promise.all(batchPromises);
        }
        console.timeEnd("Embeddings Generation");

        console.log("[UPLOAD] Total vectors:", vectors.length);

        if (vectors.length === 0) {
            return res.status(400).json({
                error: "No embeddings generated (check OpenAI key or PDF content)",
            });
        }

        // ── 7. Store vectors in Pinecone ─────────────────────────────────
        console.time("Pinecone Upsert");
        await index.namespace(documentId).upsert({ records: vectors });
        console.timeEnd("Pinecone Upsert");

        // ── 8. Upload to Cloudinary for archival (non-blocking) ──────────
        let cloudinaryUrl = null;
        try {
            const cloudinaryResult = await uploadBufferToCloudinary(pdfBuffer, fileName);
            cloudinaryUrl = cloudinaryResult.url;
        } catch (err) {
            // Cloudinary failure is non-fatal — the RAG pipeline already succeeded
            console.warn("[UPLOAD] ⚠️ Cloudinary archival failed:", err.message);
        }

        // ── 9. Persist metadata to MongoDB ───────────────────────────────
        const document = await Document.create({
            fileName,
            namespace: documentId,
            userId,
            chunkCount: chunks.length,
            cloudinaryUrl,
            extractionMethod,
            ocrStats: {
                totalPages: stats.totalPages,
                textPages: stats.textPages,
                ocrPages: stats.ocrPages,
                failedPages: stats.failedPages,
            },
            figureStats: figureStats
                ? {
                      pagesWithFigures: figureStats.pagesWithFigures,
                      totalFigures: figureStats.totalFigures,
                      figureTypes: [
                          ...new Set(figures.map((f) => f.type)),
                      ],
                  }
                : undefined,
            tableStats: tableStats
                ? {
                      pagesWithTables: tableStats.pagesWithTables,
                      totalTables: tableStats.totalTables,
                      tableTypes: [
                          ...new Set(tables.map((t) => t.type)),
                      ],
                      totalRows: tables.reduce(
                          (sum, t) => sum + (t.rows ? t.rows.length : 0),
                          0
                      ),
                  }
                : undefined,
        });

        await Chunk.insertMany(
            chunks.map((c, i) => ({
                text: c.content,
                chunkIndex: i,
                fileName: fileName,
                namespace: documentId,
                userId,
                extractionMethod: c.metadata?.extractionMethod || "text",
                ocrConfidence: c.metadata?.ocrConfidence ?? null,
                sourcePages: c.metadata?.sourcePages || [],
                figureIds: c.metadata?.figureIds || [],
                hasFigureContent: c.metadata?.hasFigureContent || false,
                tableIds: c.metadata?.tableIds || [],
                hasTableContent: c.metadata?.hasTableContent || false,
            }))
        );

        // Persist figure metadata (separate collection)
        if (figures.length > 0) {
            await Figure.insertMany(
                figures.map((f) => ({
                    figureId: f.figureId,
                    namespace: documentId,
                    userId,
                    fileName,
                    pageNumber: f.pageNumber,
                    type: f.type,
                    description: f.description,
                    caption: f.caption,
                    labels: f.labels,
                    visionModel: f.visionModel,
                }))
            );
            console.log(`[UPLOAD] ${figures.length} figure record(s) stored`);
        }

        // Persist table metadata (separate collection)
        if (tables.length > 0) {
            await Table.insertMany(
                tables.map((t) => ({
                    tableId: t.tableId,
                    namespace: documentId,
                    userId,
                    fileName,
                    pageNumber: t.pageNumber,
                    type: t.type,
                    description: t.description,
                    insights: t.insights,
                    headers: t.headers,
                    rowCount: t.rows ? t.rows.length : 0,
                    caption: t.caption,
                    visionModel: t.visionModel,
                }))
            );
            console.log(`[UPLOAD] ${tables.length} table record(s) stored`);
        }

        if (workspaceId) {
            const workspace = await Workspace.findOne({ _id: workspaceId, userId });
            if (workspace) {
                const existingIds = new Set(workspace.documentIds.map(id => id.toString()));
                existingIds.add(document._id.toString());
                workspace.documentIds = Array.from(existingIds);
                await workspace.save();
            }
        }

        console.log(
            `[UPLOAD] ✅ Complete. Namespace: ${documentId}, vectors: ${vectors.length}, ` +
                `extraction: ${extractionMethod}, figures: ${figures.length}, tables: ${tables.length}`
        );

        res.json({
            message: "PDF processed and stored successfully",
            documentId,
            mongoDocumentId: document._id,
            cloudinaryUrl,
            totalChunks: chunks.length,
            storedVectors: vectors.length,
            extractionMethod,
            ocrStats: stats,
            figureStats: figureStats || null,
            figuresFound: figures.length,
            tableStats: tableStats || null,
            tablesFound: tables.length,
        });
    } catch (error) {
        console.error("[UPLOAD] ❌ Error:", error);

        res.status(500).json({
            error: error.message || "Upload failed",
        });
    }
};
