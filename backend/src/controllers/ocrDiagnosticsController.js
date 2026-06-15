/**
 * OCR Diagnostics Controller
 *
 * Provides a debugging endpoint to inspect the OCR pipeline for a given
 * document — verifying whether OCR pages exist, chunks were generated,
 * embeddings were stored, and content is retrievable.
 *
 * Endpoint:  GET /api/diagnostics/document/:documentId/ocr
 */

import Document from "../models/Document.js";
import Chunk from "../models/Chunk.js";
import { getIndex } from "../services/vectorService.js";
import { generateEmbedding } from "../services/embeddingService.js";
import { keywordSearch } from "../services/keywordService.js";

/**
 * GET /api/diagnostics/document/:documentId/ocr
 *
 * Returns a comprehensive diagnostic report for OCR content in a document.
 */
export const getOcrDiagnostics = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const { documentId } = req.params;
        const userId = req.user._id.toString();

        // ── 1. Fetch document metadata ───────────────────────────────────
        const doc = await Document.findById(documentId).lean();
        if (!doc) {
            return res.status(404).json({ error: "Document not found" });
        }
        if (String(doc.userId) !== userId) {
            return res.status(403).json({ error: "Not authorized" });
        }

        const report = {
            documentId: doc._id.toString(),
            fileName: doc.fileName,
            namespace: doc.namespace,
            extractionMethod: doc.extractionMethod,
            ocrStats: doc.ocrStats || null,
        };

        // ── 2. Count OCR chunks in MongoDB ──────────────────────────────
        const allChunks = await Chunk.find({ namespace: doc.namespace }).lean();
        const ocrChunks = allChunks.filter(
            (c) => c.extractionMethod === "ocr" || c.extractionMethod === "mixed"
        );
        const textChunks = allChunks.filter(
            (c) => c.extractionMethod === "text" || !c.extractionMethod
        );
        const figureChunks = allChunks.filter((c) => c.extractionMethod === "figure");
        const tableChunks = allChunks.filter((c) => c.extractionMethod === "table");

        report.chunkBreakdown = {
            total: allChunks.length,
            text: textChunks.length,
            ocr: ocrChunks.length,
            figure: figureChunks.length,
            table: tableChunks.length,
        };

        // ── 3. OCR chunk details ────────────────────────────────────────
        report.ocrChunks = ocrChunks.map((c) => ({
            chunkIndex: c.chunkIndex,
            extractionMethod: c.extractionMethod,
            ocrConfidence: c.ocrConfidence,
            sourcePages: c.sourcePages,
            textLength: (c.text || "").length,
            textPreview: (c.text || "").substring(0, 200) + ((c.text || "").length > 200 ? "..." : ""),
        }));

        // ── 4. Verify embeddings exist in Pinecone ──────────────────────
        report.pineconeStatus = { checked: false, vectorCount: null, ocrVectorsFound: 0 };
        try {
            const index = getIndex();
            const ns = index.namespace(doc.namespace);

            // Query with a zero vector to get stats (Pinecone returns count)
            // Instead, we'll check if OCR chunk content is retrievable
            if (ocrChunks.length > 0) {
                const sampleText = ocrChunks[0].text || "";
                if (sampleText.trim()) {
                    const embedding = await generateEmbedding(sampleText.substring(0, 500));
                    const results = await ns.query({
                        vector: embedding,
                        topK: 5,
                        includeMetadata: true,
                    });

                    const matches = results.matches || [];
                    report.pineconeStatus.checked = true;
                    report.pineconeStatus.matchesForOcrContent = matches.length;
                    report.pineconeStatus.topMatch = matches[0]
                        ? {
                              score: matches[0].score,
                              extractionMethod: matches[0].metadata?.extractionMethod || "unknown",
                              textPreview: (matches[0].metadata?.text || "").substring(0, 150),
                          }
                        : null;
                    report.pineconeStatus.ocrVectorsFound = matches.filter(
                        (m) => m.metadata?.extractionMethod === "ocr"
                    ).length;
                }
            }
        } catch (pineconeErr) {
            report.pineconeStatus.error = pineconeErr.message;
        }

        // ── 5. BM25 retrievability test ─────────────────────────────────
        report.keywordRetrievability = { tested: false };
        try {
            if (ocrChunks.length > 0) {
                // Extract a few keywords from the first OCR chunk
                const sampleWords = (ocrChunks[0].text || "")
                    .split(/\s+/)
                    .filter((w) => w.length > 3)
                    .slice(0, 5)
                    .join(" ");

                if (sampleWords) {
                    const kwResults = await keywordSearch(
                        sampleWords,
                        [doc.namespace],
                        5
                    );
                    report.keywordRetrievability.tested = true;
                    report.keywordRetrievability.query = sampleWords;
                    report.keywordRetrievability.resultsCount = kwResults.length;
                    report.keywordRetrievability.ocrResultsCount = kwResults.filter(
                        (r) => r.extractionMethod === "ocr"
                    ).length;
                    report.keywordRetrievability.topResult = kwResults[0]
                        ? {
                              keywordScore: kwResults[0].keywordScore,
                              extractionMethod: kwResults[0].extractionMethod || "unknown",
                              textPreview: (kwResults[0].text || "").substring(0, 150),
                          }
                        : null;
                }
            }
        } catch (kwErr) {
            report.keywordRetrievability.error = kwErr.message;
        }

        // ── 6. Summary verdict ──────────────────────────────────────────
        const hasOcrPages = (doc.ocrStats?.ocrPages || 0) > 0;
        const hasOcrChunks = ocrChunks.length > 0;
        const hasOcrVectors =
            report.pineconeStatus.ocrVectorsFound > 0 ||
            (report.pineconeStatus.matchesForOcrContent || 0) > 0;
        const hasOcrKeywordHits =
            (report.keywordRetrievability.ocrResultsCount || 0) > 0 ||
            (report.keywordRetrievability.resultsCount || 0) > 0;

        report.verdict = {
            ocrPagesExist: hasOcrPages,
            ocrChunksExist: hasOcrChunks,
            ocrEmbedded: hasOcrVectors,
            ocrRetrievable: hasOcrVectors || hasOcrKeywordHits,
            status: !hasOcrPages
                ? "NO_OCR_PAGES"
                : !hasOcrChunks
                ? "OCR_CHUNKS_MISSING"
                : !hasOcrVectors
                ? "OCR_EMBEDDINGS_MISSING"
                : !(hasOcrVectors || hasOcrKeywordHits)
                ? "OCR_NOT_RETRIEVABLE"
                : "OCR_HEALTHY",
        };

        console.log(
            `[OCR-DIAG] Document ${doc.fileName}: ${report.verdict.status} ` +
                `(pages: ${doc.ocrStats?.ocrPages || 0}, chunks: ${ocrChunks.length}, ` +
                `vectors: ${report.pineconeStatus.ocrVectorsFound})`
        );

        res.json(report);
    } catch (error) {
        console.error("[OCR-DIAG] Error:", error);
        res.status(500).json({ error: error.message || "Diagnostics failed" });
    }
};
