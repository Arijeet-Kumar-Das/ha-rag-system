import { extractTextFromPDF } from "../utils/pdfParser.js";
import { chunkText } from "../utils/chunkText.js";
import { generateEmbedding } from "../services/embeddingService.js";
import { getIndex } from "../services/vectorService.js";
import { randomUUID } from "crypto";
import Chunk from "../models/Chunk.js";

export const uploadPDF = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "File is required" });
        }

        // 1. Extract text
        const text = await extractTextFromPDF(req.file.path);
        console.log("TEXT LENGTH:", text.length);

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                error: "No readable text found in PDF (maybe scanned file)"
            });
        }

        // 2. Chunk text
        const chunks = chunkText(text);
        console.log("CHUNKS:", chunks.length);
        console.log("CHUNK SAMPLE:", JSON.stringify(chunks[0]));

        if (!chunks || chunks.length === 0) {
            return res.status(400).json({
                error: "Chunking failed"
            });
        }

        const index = getIndex();

        // Save chunks to MongoDB
        const savedChunks = await Chunk.insertMany(
            chunks.map((c, i) => ({
                text: c.content,
                chunkIndex: i,
                fileName: req.file.originalname
            }))
        );

        // 3. Generate embeddings in parallel batches
        const vectors = [];
        console.time("Embeddings Generation");
        const BATCH_SIZE = 5;

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (chunkObj, indexInBatch) => {
                const globalIndex = i + indexInBatch;
                const chunk = chunkObj.content.trim();

                if (!chunk) {
                    console.warn(`Chunk ${globalIndex} is empty, skipping`);
                    return;
                }

                try {
                    const embedding = await generateEmbedding(chunk);

                    if (!Array.isArray(embedding) || embedding.length === 0) {
                        console.error(`Chunk ${globalIndex}: invalid embedding, skipping`);
                        return;
                    }

                    vectors.push({
                        id: randomUUID(),
                        values: embedding,
                        metadata: {
                            text: chunk,
                            chunkIndex: globalIndex,
                            fileName: req.file.originalname
                        }
                    });
                } catch (err) {
                    // Prevent full crash if one chunk fails
                    console.error(`Embedding failed for chunk ${globalIndex}:`, err.message);
                }
            });

            // Wait for max 5 concurrent embeddings
            await Promise.all(batchPromises);
        }
        console.timeEnd("Embeddings Generation");

        console.log("TOTAL VECTORS:", vectors.length);

        if (vectors.length === 0) {
            return res.status(400).json({
                error: "No embeddings generated (check OpenAI key or PDF content)"
            });
        }

        console.time("Pinecone Upsert");
        // 4. Store in Pinecone
        await index.upsert({ records: vectors, namespace: "default" });
        console.timeEnd("Pinecone Upsert");

        res.json({
            message: "PDF processed and stored successfully",
            totalChunks: chunks.length,
            storedVectors: vectors.length
        });

    } catch (error) {
        console.error("REAL ERROR:", error);

        res.status(500).json({
            error: error.message || "Upload failed"
        });
    }
};