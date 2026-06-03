/**
 * Fast, local query classification — no LLM call required.
 * 
 * Classifies queries into categories that drive adaptive retrieval:
 *   - "factual"     → short, specific answers (topK 3-4)
 *   - "conceptual"  → explanations, theory (topK 5-6)
 *   - "analytical"  → cross-document, comparison (topK 8-10)
 *   - "unsupported" → nonsense, off-topic, hallucination-bait
 * 
 * Note: "db" type was removed — all document-based questions now route
 * through the RAG pipeline which handles them correctly.
 */

const ANALYTICAL_PATTERNS = [
    /\b(compare|comparison|contrast|differ|difference|vs\.?|versus)\b/i,
    /\b(across|between|relationship|correlation|impact|effect)\b/i,
    /\b(analyze|analyse|evaluate|assess|critique)\b/i,
    /\b(how does .+ relate|what is the .+ between)\b/i,
    /\b(pros and cons|advantages and disadvantages|strengths and weaknesses)\b/i,
    /\b(synthesize|synthesise|integrate|combine|overall)\b/i,
];

const FACTUAL_PATTERNS = [
    /^(what is|what are|what was|what were|who is|who are|who was)\b/i,
    /^(when|where|which|how many|how much)\b/i,
    /^(define|name|list|state|mention)\b/i,
    /\b(definition of|meaning of|stands for|abbreviation)\b/i,
    /\b(port|protocol|version|number|year|date|founder|inventor)\b/i,
];

/**
 * Patterns for queries that are clearly off-topic for a document-based research assistant.
 * These must be very specific to avoid false positives on legitimate academic queries.
 */
const UNSUPPORTED_INDICATORS = [
    /\b(recipe|cook(ing)?|weather forecast|movie review|song lyrics)\b/i,
    /\b(play a game|sport score|stock price|crypto price)\b/i,
    /\b(tell me a joke|write a story|sing a song)\b/i,
];

/**
 * Classify a query using lightweight heuristics.
 * Returns { type, topK, confidence }
 */
export const classifyQuery = (question) => {
    const q = (question || "").trim();
    const wordCount = q.split(/\s+/).length;

    // Very short queries (1-2 words) are likely factual lookups
    if (wordCount <= 2) {
        return { type: "factual", topK: 4, confidence: 0.8 };
    }

    // Check for likely unsupported/off-topic queries
    for (const pattern of UNSUPPORTED_INDICATORS) {
        if (pattern.test(q)) {
            return { type: "unsupported", topK: 2, confidence: 0.7 };
        }
    }

    // Check analytical patterns (cross-document, comparison)
    let analyticalHits = 0;
    for (const pattern of ANALYTICAL_PATTERNS) {
        if (pattern.test(q)) analyticalHits++;
    }
    if (analyticalHits >= 1) {
        return { type: "analytical", topK: 9, confidence: 0.85 };
    }

    // Check factual patterns
    for (const pattern of FACTUAL_PATTERNS) {
        if (pattern.test(q)) {
            return { type: "factual", topK: 4, confidence: 0.8 };
        }
    }

    // Multi-part questions (commas or "and" separating clauses) need more context
    const hasMultipleParts = (q.match(/,/g) || []).length >= 2 || /\band\b.*\band\b/i.test(q);
    if (hasMultipleParts) {
        return { type: "conceptual", topK: 7, confidence: 0.75 };
    }

    // Longer queries are more likely conceptual
    if (wordCount >= 10) {
        return { type: "conceptual", topK: 6, confidence: 0.7 };
    }

    // Default: conceptual
    return { type: "conceptual", topK: 5, confidence: 0.6 };
};

/**
 * Legacy-compatible wrapper that returns "RAG" string.
 * The "DB" type no longer exists — all queries go through RAG.
 */
export const classifyQueryLegacy = (question) => {
    return "RAG";
};
