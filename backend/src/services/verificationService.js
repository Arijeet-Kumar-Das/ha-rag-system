/**
 * Verification service with dual-mode scoring.
 * 
 * - computeKeywordOverlap: Fast, local keyword overlap score (no API call)
 * - verifyWithLLM: LLM-based semantic verification (API call)
 * - verifyAnswer: Combined verification returning { isValid, confidence }
 */

import OpenAI from "openai";

let client;
const getClient = () => {
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
};

/**
 * Fast keyword overlap score between answer and chunk text.
 * Returns a value between 0 and 1.
 */
const computeKeywordOverlap = (answer, chunks) => {
    // Extract meaningful words (>= 4 chars, lowercased, deduplicated)
    const extractWords = (text) => {
        const stopWords = new Set([
            "this", "that", "with", "from", "have", "been", "were", "they",
            "their", "which", "about", "would", "there", "these", "other",
            "into", "more", "some", "such", "than", "also", "each", "does",
            "will", "when", "what", "your", "then", "them", "only", "over",
        ]);
        return new Set(
            text.toLowerCase()
                .replace(/[^a-z0-9\s]/g, " ")
                .split(/\s+/)
                .filter(w => w.length >= 4 && !stopWords.has(w))
        );
    };

    const answerWords = extractWords(answer);
    if (answerWords.size === 0) return 0;

    // Combine all chunk text
    const chunkText = chunks.map(c => c.text).filter(Boolean).join(" ");
    const chunkWords = extractWords(chunkText);

    // Count how many answer words appear in the chunks
    let overlap = 0;
    for (const word of answerWords) {
        if (chunkWords.has(word)) overlap++;
    }

    return overlap / answerWords.size;
};

/**
 * LLM-based semantic verification.
 * Returns a confidence score between 0 and 1.
 */
const verifyWithLLM = async (question, answer, chunks) => {
    const context = chunks.map(c => c.text).filter(Boolean).join("\n\n");

    const prompt = `You are a strict verification system. Evaluate if the given answer is fully supported by the provided context.

Context:
${context}

Question:
${question}

Answer:
${answer}

Rules:
- Respond with ONLY a JSON object: {"supported": true/false, "confidence": 0.0-1.0}
- confidence = 1.0 means the answer is completely supported by the context
- confidence = 0.0 means the answer is entirely unsupported / hallucinated
- Be strict: if the answer includes claims not present in the context, lower the confidence
- Do not explain, just return the JSON`;

    try {
        const response = await getClient().chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            messages: [
                { role: "system", content: "You are a strict answer verification engine. Respond only with valid JSON." },
                { role: "user", content: prompt }
            ]
        });

        const raw = response.choices[0].message.content.trim();
        // Parse JSON, handle potential markdown wrapping
        const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(cleaned);

        return {
            supported: result.supported === true,
            confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0))
        };
    } catch (err) {
        console.error("[Verification] LLM verification failed:", err.message);
        // Fallback: return neutral
        return { supported: true, confidence: 0.5 };
    }
};

/**
 * Combined verification:
 * - Keyword overlap (fast, local)
 * - LLM semantic check (slower, accurate)
 * - Blended confidence score
 * 
 * @returns {{ isValid: boolean, confidence: number }}
 */
export const verifyAnswer = async (question, answer, chunks) => {
    // 1. Fast keyword overlap
    const keywordScore = computeKeywordOverlap(answer, chunks);
    console.log(`[Verification] Keyword overlap score: ${keywordScore.toFixed(3)}`);

    // 2. LLM semantic verification
    const llmResult = await verifyWithLLM(question, answer, chunks);
    console.log(`[Verification] LLM confidence: ${llmResult.confidence.toFixed(3)}, supported: ${llmResult.supported}`);

    // 3. Blended score (70% LLM, 30% keyword)
    const confidence = (llmResult.confidence * 0.7) + (keywordScore * 0.3);
    const isValid = llmResult.supported && confidence >= 0.4;

    console.log(`[Verification] Final → confidence: ${confidence.toFixed(3)}, isValid: ${isValid}`);

    return { isValid, confidence: Math.round(confidence * 100) / 100 };
};