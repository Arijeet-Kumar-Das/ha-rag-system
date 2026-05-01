import { extractTextFromPDF } from "../utils/pdfParser.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";
import { chunkText } from "../utils/chunkText.js";
import { generateEmbedding } from "../services/embeddingService.js";
import { getIndex } from "../services/vectorService.js";
import { randomUUID } from "crypto";
import Chunk from "../models/Chunk.js";
import Document from "../models/Document.js";

export const uploadPDF = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "File is required" });
        }

        // With memoryStorage, the file buffer is available directly
        const pdfBuffer = req.file.buffer;
        const fileName = req.file.originalname;

        console.log(`[UPLOAD] File received: ${fileName} (${pdfBuffer.length} bytes)`);

        const index = getIndex();
        const userId = req.user?._id?.toString() || "anonymous";
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
            await Document.deleteOne({ namespace: existingDoc.namespace });
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
                await Document.deleteOne({ namespace: oldestDoc.namespace });
            }
        }

        const documentId = randomUUID();

        // ── 2. Extract text directly from the in-memory buffer ───────────
        const text = await extractTextFromPDF(pdfBuffer);
        console.log("[UPLOAD] Text length:", text.length);

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                error: "No readable text found in PDF (maybe scanned file)",
            });
        }

        // ── 3. Chunk text ────────────────────────────────────────────────
        const chunks = chunkText(text);
        console.log("[UPLOAD] Chunks:", chunks.length);

        if (!chunks || chunks.length === 0) {
            return res.status(400).json({ error: "Chunking failed" });
        }

        // ── 4. Generate embeddings in parallel batches ───────────────────
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

        // ── 5. Store vectors in Pinecone ─────────────────────────────────
        console.time("Pinecone Upsert");
        await index.namespace(documentId).upsert({ records: vectors });
        console.timeEnd("Pinecone Upsert");

        // ── 6. Upload to Cloudinary for archival (non-blocking) ──────────
        let cloudinaryUrl = null;
        try {
            const cloudinaryResult = await uploadBufferToCloudinary(pdfBuffer, fileName);
            cloudinaryUrl = cloudinaryResult.url;
        } catch (err) {
            // Cloudinary failure is non-fatal — the RAG pipeline already succeeded
            console.warn("[UPLOAD] ⚠️ Cloudinary archival failed:", err.message);
        }

        // ── 7. Persist metadata to MongoDB ───────────────────────────────
        await Document.create({
            fileName,
            namespace: documentId,
            userId,
            chunkCount: chunks.length,
            cloudinaryUrl,
        });

        await Chunk.insertMany(
            chunks.map((c, i) => ({
                text: c.content,
                chunkIndex: i,
                fileName: fileName,
                namespace: documentId,
            }))
        );

        console.log(
            `[UPLOAD] ✅ Complete. Namespace: ${documentId}, vectors: ${vectors.length}`
        );

        res.json({
            message: "PDF processed and stored successfully",
            documentId,
            cloudinaryUrl,
            totalChunks: chunks.length,
            storedVectors: vectors.length,
        });
    } catch (error) {
        console.error("[UPLOAD] ❌ Error:", error);

        res.status(500).json({
            error: error.message || "Upload failed",
        });
    }
};