import { generateEmbedding } from "./embeddingService.js";
import { getIndex } from "./vectorService.js";
import { keywordSearch } from "./keywordService.js";

export const retrieveRelevantChunks = async (query) => {
    const index = getIndex();

    // 1. Semantic search
    const queryEmbedding = await generateEmbedding(query);

    const semanticResults = await index.query({
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true,
        namespace: "default"
    });

    const semanticChunks = semanticResults.matches.map(m => ({
        text: m.metadata.text || m.metadata.content || "",
        chunkIndex: m.metadata.chunkIndex,
        fileName: m.metadata.fileName,
        semanticScore: m.score
    }));

    // 2. Keyword search & Fallback check
    let keywordChunks = [];
    try {
        keywordChunks = await keywordSearch(query);
    } catch (e) {
        console.error("Keyword search failed:", e);
    }

    if (semanticChunks.length < 2) {
        console.log("[Retrieval] Pinecone returned < 2 chunks. Relying on keyword results.");
    }

    // 3. Normalize scores
    const maxSemantic = Math.max(...semanticChunks.map(c => c.semanticScore || 0), 1);
    const maxKeyword = Math.max(...keywordChunks.map(c => c.keywordScore || 0), 1);

    // 4. Deduplication logic
    const mergedMap = new Map();

    const getChunkKey = (chunk) => {
        if (chunk.fileName && chunk.chunkIndex !== undefined && chunk.chunkIndex !== null) {
            return `${chunk.fileName}_${chunk.chunkIndex}`;
        }
        return (chunk.text || "").substring(0, 100);
    };

    const addChunk = (chunk, isSemantic) => {
        const key = getChunkKey(chunk);
        if (mergedMap.has(key)) {
            const existing = mergedMap.get(key);
            if (isSemantic) existing.semanticScore = chunk.semanticScore;
            else existing.keywordScore = chunk.keywordScore;
        } else {
            mergedMap.set(key, {
                text: chunk.text,
                chunkIndex: chunk.chunkIndex,
                fileName: chunk.fileName,
                semanticScore: isSemantic ? chunk.semanticScore : 0,
                keywordScore: isSemantic ? 0 : chunk.keywordScore
            });
        }
    };

    semanticChunks.forEach(c => addChunk(c, true));
    keywordChunks.forEach(c => addChunk(c, false));

    const combined = Array.from(mergedMap.values());

    // 5. Score fusion (normalized)
    const scored = combined.map(chunk => ({
        ...chunk,
        finalScore:
            ((chunk.semanticScore || 0) / maxSemantic) * 0.7 +
            ((chunk.keywordScore || 0) / maxKeyword) * 0.3
    }));

    // 6. Sort and return top 5
    return scored
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, 5);
};