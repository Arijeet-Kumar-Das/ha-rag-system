/**
 * Query Rewrite Service
 *
 * Rewrites vague follow-up questions into standalone queries using
 * conversation history.  Two strategies are employed:
 *
 *   1. **Heuristic** (< 1 ms, no API call)
 *      Detects common follow-up patterns and grafts the subject from
 *      the most recent user message onto the current question.
 *
 *   2. **LLM fallback** (~200 ms, gpt-4o-mini)
 *      Used only when heuristic confidence is low and the feature flag
 *      QUERY_REWRITE_LLM_ENABLED is true.
 *
 * Public API:
 *   rewriteQuery(question, chatHistory) → { rewritten, method, original }
 */

import OpenAI from "openai";

// ── Configuration ─────────────────────────────────────────────────────────
const REWRITE_ENABLED =
    (process.env.QUERY_REWRITE_ENABLED ?? "true") !== "false";
const LLM_REWRITE_ENABLED =
    (process.env.QUERY_REWRITE_LLM_ENABLED ?? "true") !== "false";
const HISTORY_LIMIT =
    parseInt(process.env.CHAT_HISTORY_LIMIT, 10) || 10;

// ── OpenAI client (lazy) ─────────────────────────────────────────────────
let client;
const getClient = () => {
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
};

// ── Follow-up pattern detection ──────────────────────────────────────────

/**
 * Patterns that strongly indicate the question is a follow-up that cannot
 * stand alone.  Each entry has a regex and an optional rewrite template.
 * `$SUBJECT` is replaced with the inferred subject from history.
 */
const FOLLOW_UP_PATTERNS = [
    // "Explain more" / "Tell me more" / "More details"
    { regex: /^(explain|tell me|give|provide)\s+(more|further|in\s+more\s+detail)/i, template: "Explain $SUBJECT in more detail" },
    { regex: /^more\s+(details?|info(rmation)?|about\s+(it|that|this))/i, template: "Provide more details about $SUBJECT" },
    { regex: /^(elaborate|expand)\s*(on\s+(it|that|this))?/i, template: "Elaborate on $SUBJECT" },

    // "Summarize that" / "Summarize"
    { regex: /^summarize\s*(it|that|this|the above)?\.?$/i, template: "Summarize $SUBJECT" },
    { regex: /^(give|provide)\s+(a\s+)?summary/i, template: "Summarize $SUBJECT" },

    // "What do you mean?" / "What does that mean?"
    { regex: /^what\s+do(es)?\s+(you|that|it|this)\s+mean/i, template: "What does $SUBJECT mean?" },

    // Bare pronouns as subject: "How heavy was it?"
    { regex: /^(how|what|when|where|why|who|which)\b.*\b(it|its|they|them|their|this|that|these|those)\b/i, template: null },

    // Single-word follow-ups
    { regex: /^(why|how|when|where|who)\??\s*$/i, template: "$1 $SUBJECT?" },

    // "Compare them" / "Compare those"
    { regex: /^compare\s+(them|those|these|it)\s*/i, template: "Compare $SUBJECT" },

    // Generic short follow-ups
    { regex: /^(and|also|what about|how about)\b/i, template: null },
    { regex: /^(yes|yeah|yep|sure|ok|okay),?\s/i, template: null },
];

/**
 * Minimum word count below which a question is almost certainly a follow-up.
 */
const SHORT_QUERY_THRESHOLD = 4;

// ── Subject extraction ──────────────────────────────────────────────────

/**
 * Extract the most likely "subject" from recent chat history.
 * Looks at the last user message by default; falls back to the last
 * assistant message if the user message is also short.
 */
const extractSubject = (chatHistory) => {
    if (!chatHistory || chatHistory.length === 0) return null;

    // Walk backward through history to find the last substantive user message
    for (let i = chatHistory.length - 1; i >= 0; i--) {
        const msg = chatHistory[i];
        if (msg.role === "user") {
            const words = (msg.content || "").trim().split(/\s+/);
            if (words.length >= 3) {
                return msg.content.trim();
            }
        }
    }

    // Fallback: try the last assistant message (extract key phrases)
    for (let i = chatHistory.length - 1; i >= 0; i--) {
        const msg = chatHistory[i];
        if (msg.role === "assistant" && msg.content) {
            // Take the first sentence as a rough subject
            const firstSentence = msg.content.split(/[.!?\n]/)[0].trim();
            if (firstSentence.length > 10 && firstSentence.length < 200) {
                return firstSentence;
            }
        }
    }

    return null;
};

// ── Heuristic rewrite ────────────────────────────────────────────────────

/**
 * Try to rewrite the query using pattern matching.
 * Returns { rewritten, confidence } or null if no pattern matches.
 */
const heuristicRewrite = (question, chatHistory) => {
    const q = question.trim();
    const words = q.split(/\s+/);
    const subject = extractSubject(chatHistory);

    if (!subject) return null;

    // 1. Check explicit follow-up patterns
    for (const { regex, template } of FOLLOW_UP_PATTERNS) {
        const match = q.match(regex);
        if (match) {
            let rewritten;
            if (template) {
                rewritten = template.replace("$SUBJECT", subject);
                // Replace any leftover $1, $2 etc. from regex groups
                rewritten = rewritten.replace(/\$(\d+)/g, (_, n) => match[parseInt(n)] || "");
            } else {
                // No template — prepend subject as context
                rewritten = `Regarding "${subject}": ${q}`;
            }
            return { rewritten, confidence: 0.9 };
        }
    }

    // 2. Very short queries (1-3 words) without question words are likely follow-ups
    if (words.length <= SHORT_QUERY_THRESHOLD) {
        const hasQuestionWord = /^(what|how|why|when|where|who|which|is|are|was|were|do|does|did|can|could|will|would)/i.test(q);
        if (!hasQuestionWord) {
            return {
                rewritten: `Regarding "${subject}": ${q}`,
                confidence: 0.7,
            };
        }
    }

    // 3. Pronoun-heavy queries (contains "it", "they", "that" etc. as key subjects)
    const pronounHeavy = /\b(it|its|they|them|their|this|that|these|those)\b/gi;
    const pronounCount = (q.match(pronounHeavy) || []).length;
    const substantiveWords = words.filter(w => w.length > 3 && !["what", "when", "where", "which", "that", "this", "them", "they", "their", "those", "these", "does", "have", "been", "were", "about", "from", "with"].includes(w.toLowerCase()));

    if (pronounCount > 0 && substantiveWords.length <= 2) {
        // Replace pronouns with subject
        const rewritten = q.replace(pronounHeavy, () => `"${subject}"`);
        return { rewritten, confidence: 0.75 };
    }

    return null;
};

// ── LLM rewrite ──────────────────────────────────────────────────────────

/**
 * Use a fast LLM call to rewrite the query as a standalone question.
 */
const llmRewrite = async (question, chatHistory) => {
    const recentHistory = chatHistory.slice(-6);
    const historyText = recentHistory
        .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${(m.content || "").substring(0, 300)}`)
        .join("\n");

    try {
        const response = await getClient().chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            max_tokens: 100,
            messages: [
                {
                    role: "system",
                    content: `You are a query rewriter. Given a conversation history and a follow-up question, rewrite the follow-up as a standalone question that includes the necessary context from the conversation. Return ONLY the rewritten question, nothing else. If the question is already standalone, return it unchanged.`,
                },
                {
                    role: "user",
                    content: `Conversation:\n${historyText}\n\nFollow-up question: ${question}\n\nRewritten standalone question:`,
                },
            ],
        });

        const rewritten = response.choices[0].message.content.trim();
        return rewritten || question;
    } catch (err) {
        console.error("[QUERY-REWRITE] LLM rewrite failed:", err.message);
        return question;
    }
};

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Rewrite a follow-up question into a standalone query using conversation
 * history.  Returns the original question unchanged if:
 *   - Feature is disabled
 *   - No chat history exists
 *   - The question appears to be standalone
 *
 * @param  {string} question     The user's current question.
 * @param  {Array}  chatHistory  Array of { role, content } messages.
 * @returns {Promise<{ rewritten: string, method: string, original: string }>}
 */
export const rewriteQuery = async (question, chatHistory = []) => {
    const original = question;

    // Bail out if disabled or no history to reference
    if (!REWRITE_ENABLED || !chatHistory || chatHistory.length === 0) {
        return { rewritten: original, method: "none", original };
    }

    // Trim history to configured limit
    const trimmedHistory = chatHistory.slice(-HISTORY_LIMIT);

    // 1. Try heuristic rewrite first (instant)
    const heuristic = heuristicRewrite(question, trimmedHistory);
    if (heuristic && heuristic.confidence >= 0.7) {
        console.log(`[QUERY-REWRITE] Heuristic rewrite (confidence: ${heuristic.confidence}):`);
        console.log(`  Original:  "${original}"`);
        console.log(`  Rewritten: "${heuristic.rewritten}"`);
        return { rewritten: heuristic.rewritten, method: "heuristic", original };
    }

    // 2. Try LLM rewrite if enabled and question looks like a follow-up
    if (LLM_REWRITE_ENABLED) {
        const words = question.trim().split(/\s+/);
        const isLikelyFollowUp =
            words.length <= 6 ||
            heuristic !== null ||  // Pattern matched but low confidence
            /\b(it|its|they|them|their|this|that)\b/i.test(question);

        if (isLikelyFollowUp) {
            const rewritten = await llmRewrite(question, trimmedHistory);
            if (rewritten !== question) {
                console.log(`[QUERY-REWRITE] LLM rewrite:`);
                console.log(`  Original:  "${original}"`);
                console.log(`  Rewritten: "${rewritten}"`);
                return { rewritten, method: "llm", original };
            }
        }
    }

    // 3. No rewrite needed — question is standalone
    console.log(`[QUERY-REWRITE] No rewrite needed: "${original}"`);
    return { rewritten: original, method: "none", original };
};
