import { generateEmbedding } from "./embeddingService.js";
import { getIndex } from "./vectorService.js";
import { keywordSearch } from "./keywordService.js";

// ── Similarity thresholds ────────────────────────────────────────────────
const SIMILARITY_THRESHOLD = 0.25;       // Minimum cosine similarity to keep a chunk
const DEDUP_TEXT_SIMILARITY = 0.85;      // Text overlap ratio above which chunks are deduped
const LOW_CONFIDENCE_THRESHOLD = 0.30;   // If best score < this, return empty (no relevant docs)
const KEYWORD_TIMEOUT_MS = 400;          // Max time to wait for keyword search

// ── Helpers ──────────────────────────────────────────────────────────────

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

/**
 * Calculate text overlap ratio between two strings.
 * Uses word-set Jaccard similarity for speed.
 */
const textOverlapRatio = (textA, textB) => {
    if (!textA || !textB) return 0;

    const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter(w => w.length > 3));

    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    for (const word of wordsA) {
        if (wordsB.has(word)) intersection++;
    }

    return intersection / Math.min(wordsA.size, wordsB.size);
};

/**
 * Remove near-duplicate chunks based on text overlap.
 * Keeps the chunk with the higher finalScore.
 */
const deduplicateChunks = (chunks) => {
    const result = [];

    for (const chunk of chunks) {
        let isDuplicate = false;

        for (const kept of result) {
            if (textOverlapRatio(chunk.text, kept.text) >= DEDUP_TEXT_SIMILARITY) {
                isDuplicate = true;
                break;
            }
        }

        if (!isDuplicate) {
            result.push(chunk);
        }
    }

    return result;
};

/**
 * Race a promise against a timeout. Returns the result or a fallback.
 */
const withTimeout = (promise, ms, fallback) => {
    let timer;
    return Promise.race([
        promise,
        new Promise(resolve => {
            timer = setTimeout(() => resolve(fallback), ms);
        })
    ]).finally(() => clearTimeout(timer));
};

/**
 * Core retrieval with adaptive depth, parallel search, similarity filtering, and deduplication.
 *
 * @param {string}  query         - The user's question
 * @param {Array}   targetInput   - Document targets (namespace/documentId/fileName)
 * @param {Object}  options
 * @param {number}  options.topK  - Adaptive topK from query classification
 * @param {string}  options.queryType - "factual" | "conceptual" | "analytical" | "unsupported"
 * @param {Object}  options.timings - Object to collect timing data
 */
export const retrieveRelevantChunks = async (query, targetInput, options = {}) => {
    const {
        topK = 5,
        queryType = "conceptual",
        timings = {}
    } = options;

    const targets = normalizeTargets(targetInput);
    if (targets.length === 0) {
        return [];
    }

    const index = getIndex();
    const targetMeta = getTargetMeta(targets);
    const namespaces = targets.map(target => target.namespace);

    console.log("[RETRIEVAL] Namespaces:", namespaces);
    console.log("[RETRIEVAL] Query:", query);
    console.log(`[RETRIEVAL] Adaptive topK: ${topK}, queryType: ${queryType}`);

    const cleanQuery = query.toLowerCase().trim();

    // ── Adaptive per-namespace topK ──────────────────────────────────────
    const topKPerNamespace = targets.length > 1
        ? Math.max(3, Math.ceil(topK / targets.length) + 2)
        : topK + 2;

    const finalLimit = topK;

    // ── Run embedding + keyword search in parallel ──────────────────────
    const embeddingStart = Date.now();

    const [queryEmbedding, keywordResults] = await Promise.all([
        generateEmbedding(cleanQuery),
        (async () => {
            const kwStart = Date.now();
            try {
                // Keyword search with timeout — if MongoDB is slow, skip it
                const results = await withTimeout(
                    keywordSearch(query, namespaces, finalLimit + 4),
                    KEYWORD_TIMEOUT_MS,
                    []
                );
                timings.keywordSearchMs = Date.now() - kwStart;
                if (results.length === 0 && Date.now() - kwStart >= KEYWORD_TIMEOUT_MS) {
                    console.log(`[RETRIEVAL] Keyword search timed out after ${KEYWORD_TIMEOUT_MS}ms, using semantic-only`);
                }
                return results.map(chunk => enrichChunk(chunk, targetMeta));
            } catch (e) {
                console.error("[RETRIEVAL] Keyword search failed:", e.message);
                timings.keywordSearchMs = Date.now() - kwStart;
                return [];
            }
        })()
    ]);

    timings.embeddingMs = Date.now() - embeddingStart;

    // ── Vector search (parallel across all namespaces) ──────────────────
    const vectorStart = Date.now();
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
    timings.vectorSearchMs = Date.now() - vectorStart;

    const semanticChunks = semanticResponses.flatMap(result => {
        if (result.status === "fulfilled") return result.value;
        console.error("[RETRIEVAL] Semantic namespace search failed:", result.reason?.message || result.reason);
        return [];
    });

    console.log(`[RETRIEVAL] Raw semantic matches: ${semanticChunks.length}`);
    console.log(`[RETRIEVAL] Raw keyword matches: ${keywordResults.length}`);

    // ── Similarity threshold filtering ───────────────────────────────────
    const filteredSemantic = semanticChunks.filter(c => (c.semanticScore || 0) >= SIMILARITY_THRESHOLD);
    console.log(`[RETRIEVAL] After similarity threshold (>=${SIMILARITY_THRESHOLD}): ${filteredSemantic.length}`);

    // ── Low-confidence bail-out ──────────────────────────────────────────
    const bestScore = filteredSemantic.length > 0
        ? Math.max(...filteredSemantic.map(c => c.semanticScore || 0))
        : 0;

    if (bestScore < LOW_CONFIDENCE_THRESHOLD && keywordResults.length === 0) {
        console.log(`[RETRIEVAL] Low confidence bail-out (best score: ${bestScore.toFixed(3)})`);
        return [];
    }

    // ── Fallback: if no semantic results pass threshold, try keyword-only ──
    if (filteredSemantic.length === 0) {
        console.log("[RETRIEVAL] No semantic results above threshold, using keyword-only");
        const deduped = deduplicateChunks(keywordResults.slice(0, finalLimit));
        console.log(`[RETRIEVAL] Final chunks (keyword-only): ${deduped.length}`);
        return deduped;
    }

    // ── Merge semantic + keyword results ─────────────────────────────────
    const mergeStart = Date.now();
    const maxSemantic = Math.max(...filteredSemantic.map(c => c.semanticScore || 0), 1);
    const maxKeyword = Math.max(...keywordResults.map(c => c.keywordScore || 0), 1);
    const mergedMap = new Map();

    const addChunk = (chunk, isSemantic) => {
        const enriched = enrichChunk(chunk, targetMeta);
        const key = getChunkKey(enriched);

        if (mergedMap.has(key)) {
            const existing = mergedMap.get(key);
            if (isSemantic) existing.semanticScore = Math.max(existing.semanticScore, enriched.semanticScore || 0);
            else existing.keywordScore = Math.max(existing.keywordScore, enriched.keywordScore || 0);
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

    filteredSemantic.forEach(chunk => addChunk(chunk, true));
    keywordResults.forEach(chunk => addChunk(chunk, false));

    // ── Score and rank ───────────────────────────────────────────────────
    const scored = Array.from(mergedMap.values()).map(chunk => ({
        ...chunk,
        finalScore:
            ((chunk.semanticScore || 0) / maxSemantic) * 0.7 +
            ((chunk.keywordScore || 0) / maxKeyword) * 0.3
    }));

    const sorted = scored.sort((a, b) => b.finalScore - a.finalScore);

    // ── Deduplicate near-identical content ────────────────────────────────
    const deduped = deduplicateChunks(sorted);

    // ── Apply final limit ────────────────────────────────────────────────
    const finalChunks = deduped.slice(0, finalLimit);

    timings.mergeMs = Date.now() - mergeStart;

    console.log(`[RETRIEVAL] After dedup: ${deduped.length}, final: ${finalChunks.length}`);
    console.log(`[RETRIEVAL] Timings — embedding: ${timings.embeddingMs}ms, vector: ${timings.vectorSearchMs}ms, keyword: ${timings.keywordSearchMs}ms, merge: ${timings.mergeMs}ms`);

    return finalChunks;
};
