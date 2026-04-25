import { generateEmbedding } from "./embeddingService.js";
import { getIndex } from "./vectorService.js";
import { keywordSearch } from "./keywordService.js";

export const retrieveRelevantChunks = async (query, namespace) => {
    if (!namespace) {
        return [];
    }

    const index = getIndex();
    console.log("Using namespace:", namespace);
    console.log("Query:", query);

    // 1. Semantic search
    const cleanQuery = query.toLowerCase().trim();
    const queryEmbedding = await generateEmbedding(cleanQuery);

    const namespaceIndex = index.namespace(namespace);
    
    const semanticResults = await namespaceIndex.query({
        vector: queryEmbedding,
        topK: 10,
        includeMetadata: true
    });
    console.log("Semantic matches:", semanticResults.matches.length);

    const semanticChunks = semanticResults.matches.map(m => ({
        text: m.metadata.text || m.metadata.content || "",
        chunkIndex: m.metadata.chunkIndex,
        fileName: m.metadata.fileName,
        semanticScore: m.score
    }));

    // 2. Keyword search & Fallback check
    let keywordChunks = [];
    try {
        keywordChunks = await keywordSearch(query, namespace);
    } catch (e) {
        console.error("Keyword search failed:", e);
    }

    if (semanticResults.matches.length < 3) {
        const keywordOnly = keywordChunks.slice(0, 5);
        while (keywordOnly.length < 3 && keywordChunks.length > keywordOnly.length) {
            keywordOnly.push(keywordChunks[keywordOnly.length]);
        }
        console.log("Final chunks:", keywordOnly.length);
        return keywordOnly;
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

    // 6. Sort and return top 5 with a minimum of 3 chunks (prefer keyword for fill)
    const finalChunks = scored
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, 5);

    if (finalChunks.length < 3) {
        const seen = new Set(
            finalChunks.map((chunk) =>
                chunk.fileName && chunk.chunkIndex !== undefined && chunk.chunkIndex !== null
                    ? `${chunk.fileName}_${chunk.chunkIndex}`
                    : (chunk.text || "").substring(0, 100)
            )
        );

        for (const keywordChunk of keywordChunks) {
            const key =
                keywordChunk.fileName && keywordChunk.chunkIndex !== undefined && keywordChunk.chunkIndex !== null
                    ? `${keywordChunk.fileName}_${keywordChunk.chunkIndex}`
                    : (keywordChunk.text || "").substring(0, 100);

            if (!seen.has(key)) {
                finalChunks.push({
                    ...keywordChunk,
                    semanticScore: keywordChunk.semanticScore || 0,
                    keywordScore: keywordChunk.keywordScore || 0,
                    finalScore: keywordChunk.keywordScore || 0
                });
                seen.add(key);
            }

            if (finalChunks.length >= 3) break;
        }
    }

    console.log("Final chunks:", finalChunks.length);
    return finalChunks;
};