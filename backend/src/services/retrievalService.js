import { generateEmbedding } from "./embeddingService.js";
import { getIndex } from "./vectorService.js";
import { keywordSearch } from "./keywordService.js";

const normalizeTargets = (targetInput) => {
    const input = Array.isArray(targetInput) ? targetInput : [targetInput];

    return input
        .filter(Boolean)
        .map(target => {
            if (typeof target === "string") {
                return { namespace: target, documentId: null, fileName: null };
            }

            return {
                namespace: target.namespace,
                documentId: target.documentId || target._id || null,
                fileName: target.fileName || null
            };
        })
        .filter(target => target.namespace);
};

const getTargetMeta = (targets) => {
    const byNamespace = new Map();
    targets.forEach(target => byNamespace.set(target.namespace, target));
    return byNamespace;
};

const getChunkKey = (chunk) => {
    const namespace = chunk.namespace || "unknown";
    if (chunk.chunkIndex !== undefined && chunk.chunkIndex !== null) {
        return `${namespace}_${chunk.chunkIndex}`;
    }
    return `${namespace}_${(chunk.text || "").substring(0, 100)}`;
};

const enrichChunk = (chunk, targetMeta) => {
    const target = targetMeta.get(chunk.namespace) || {};

    return {
        ...chunk,
        documentId: chunk.documentId || target.documentId || null,
        fileName: chunk.fileName || target.fileName || "unknown"
    };
};

export const retrieveRelevantChunks = async (query, targetInput) => {
    const targets = normalizeTargets(targetInput);
    if (targets.length === 0) {
        return [];
    }

    const index = getIndex();
    const targetMeta = getTargetMeta(targets);
    const namespaces = targets.map(target => target.namespace);

    console.log("Using namespaces:", namespaces);
    console.log("Query:", query);

    const cleanQuery = query.toLowerCase().trim();
    const queryEmbedding = await generateEmbedding(cleanQuery);
    const topKPerNamespace = targets.length > 1 ? 6 : 10;
    const finalLimit = targets.length > 1 ? Math.min(12, Math.max(8, targets.length * 4)) : 5;

    const semanticResponses = await Promise.allSettled(
        targets.map(async target => {
            const namespaceIndex = index.namespace(target.namespace);
            const results = await namespaceIndex.query({
                vector: queryEmbedding,
                topK: topKPerNamespace,
                includeMetadata: true
            });

            return (results.matches || []).map(match => ({
                text: match.metadata?.text || match.metadata?.content || "",
                chunkIndex: match.metadata?.chunkIndex,
                fileName: match.metadata?.fileName || target.fileName,
                namespace: target.namespace,
                documentId: target.documentId,
                semanticScore: match.score
            }));
        })
    );

    const semanticChunks = semanticResponses.flatMap(result => {
        if (result.status === "fulfilled") return result.value;
        console.error("Semantic namespace search failed:", result.reason?.message || result.reason);
        return [];
    });
    console.log("Semantic matches:", semanticChunks.length);

    let keywordChunks = [];
    try {
        keywordChunks = (await keywordSearch(query, namespaces, finalLimit)).map(chunk => enrichChunk(chunk, targetMeta));
    } catch (e) {
        console.error("Keyword search failed:", e);
    }

    if (semanticChunks.length < 3) {
        const keywordOnly = keywordChunks.slice(0, finalLimit);
        while (keywordOnly.length < 3 && keywordChunks.length > keywordOnly.length) {
            keywordOnly.push(keywordChunks[keywordOnly.length]);
        }
        console.log("Final chunks:", keywordOnly.length);
        return keywordOnly;
    }

    const maxSemantic = Math.max(...semanticChunks.map(c => c.semanticScore || 0), 1);
    const maxKeyword = Math.max(...keywordChunks.map(c => c.keywordScore || 0), 1);
    const mergedMap = new Map();

    const addChunk = (chunk, isSemantic) => {
        const enriched = enrichChunk(chunk, targetMeta);
        const key = getChunkKey(enriched);

        if (mergedMap.has(key)) {
            const existing = mergedMap.get(key);
            if (isSemantic) existing.semanticScore = enriched.semanticScore;
            else existing.keywordScore = enriched.keywordScore;
            return;
        }

        mergedMap.set(key, {
            text: enriched.text,
            chunkIndex: enriched.chunkIndex,
            fileName: enriched.fileName,
            namespace: enriched.namespace,
            documentId: enriched.documentId,
            semanticScore: isSemantic ? enriched.semanticScore : 0,
            keywordScore: isSemantic ? 0 : enriched.keywordScore
        });
    };

    semanticChunks.forEach(chunk => addChunk(chunk, true));
    keywordChunks.forEach(chunk => addChunk(chunk, false));

    const scored = Array.from(mergedMap.values()).map(chunk => ({
        ...chunk,
        finalScore:
            ((chunk.semanticScore || 0) / maxSemantic) * 0.7 +
            ((chunk.keywordScore || 0) / maxKeyword) * 0.3
    }));

    const finalChunks = scored
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, finalLimit);

    if (finalChunks.length < 3) {
        const seen = new Set(finalChunks.map(getChunkKey));

        for (const keywordChunk of keywordChunks) {
            const key = getChunkKey(keywordChunk);
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
