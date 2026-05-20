/**
 * Fast, local query classification — no LLM call required.
 * 
 * Classifies queries into categories that drive adaptive retrieval:
 *   - "factual"     → short, specific answers (topK 3-4)
 *   - "conceptual"  → explanations, theory (topK 5-6)
 *   - "analytical"  → cross-document, comparison (topK 8-10)
 *   - "db"          → structured data (fees, dates, schedules)
 *   - "unsupported" → nonsense, off-topic, hallucination-bait
 * 
 * Replaces the previous LLM-based classifier to eliminate ~1-2s latency.
 */

const DB_PATTERNS = [
    /\b(fee|fees|tuition|cost|price|payment)\b/i,
    /\b(deadline|due date|last date|registration date)\b/i,
    /\b(schedule|timetable|exam date|class timing)\b/i,
    /\b(course list|syllabus|curriculum|credit)\b/i,
    /\b(admission|enrollment|eligibility)\b/i,
    /\b(contact|phone|email|address|office)\b/i,
    /\b(hostel|mess|cafeteria|library hours)\b/i,
];

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

const UNSUPPORTED_INDICATORS = [
    /\b(quantum scrum|agile blockchain|neural waterfall)\b/i,
    /\b(recipe|cook|weather|movie|song|joke|story)\b/i,
    /\b(play|game|sport score|stock price|crypto)\b/i,
    /\b(translate|translation)\b/i,
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
        return { type: "factual", topK: 3, confidence: 0.8 };
    }

    // Check DB patterns first (structured data)
    for (const pattern of DB_PATTERNS) {
        if (pattern.test(q)) {
            return { type: "db", topK: 0, confidence: 0.9 };
        }
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

    // Longer queries are more likely conceptual
    if (wordCount >= 10) {
        return { type: "conceptual", topK: 6, confidence: 0.7 };
    }

    // Default: conceptual
    return { type: "conceptual", topK: 5, confidence: 0.6 };
};

/**
 * Legacy-compatible wrapper that returns "RAG" or "DB" string.
 * Kept for backward compatibility if any code still expects the old interface.
 */
export const classifyQueryLegacy = (question) => {
    const result = classifyQuery(question);
    return result.type === "db" ? "DB" : "RAG";
};
