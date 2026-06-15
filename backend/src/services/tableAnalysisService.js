/**
 * Table Analysis Service
 *
 * Provider-agnostic service that sends extracted table data to OpenAI
 * for retrieval-optimised analysis.  Generates rich, searchable text
 * descriptions including comparisons, trends, rankings, and conclusions.
 *
 * Uses the same lazy OpenAI client pattern as embeddingService.js and
 * visionService.js — designed to be swappable with any LLM provider.
 *
 * Public API:
 *   analyzeTable(tableData, pageNumber)
 *     → { description: string, insights: string, model: string, tokensUsed: number }
 */

import OpenAI from "openai";

// ── Configuration ─────────────────────────────────────────────────────────
const VISION_MODEL = process.env.VISION_MODEL || "gpt-4o-mini";

// ── OpenAI client (lazy singleton — matches embeddingService pattern) ─────
let client;
const getClient = () => {
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
};

// ── Retrieval-optimised system prompt ─────────────────────────────────────
const SYSTEM_PROMPT = `You are a research document analyst specializing in extracting retrieval-optimized descriptions from tables in academic and technical documents.

Given structured table data (headers, rows, and optional caption), produce two sections:

1. **DESCRIPTION** — A concise, factual summary of what the table contains:
   - State the table's purpose and scope
   - Mention the key columns/variables and what they measure
   - Note the number of rows/entries and what they represent

2. **INSIGHTS** — Retrieval-optimized analytical observations:
   - Comparisons: "A outperforms B by 10 percentage points"
   - Trends: "Revenue grew 5x from $10M in 2020 to $50M in 2024"
   - Rankings: "HA-RAG ranks first at 95.2%, followed by Model B at 90.1%"
   - Numerical relationships: "Precision and recall are inversely correlated across all models"
   - Extremes: "The maximum value is X, the minimum is Y"
   - Conclusions that can be inferred from the data

CRITICAL RULES:
- Be specific and quantitative — use exact numbers from the table
- Write as if explaining to a researcher who cannot see the table
- Each insight must be self-contained and independently useful for search
- Do NOT simply restate the raw data row-by-row
- Focus on patterns, comparisons, and actionable conclusions

Return a JSON object with NO markdown code fencing:
{
  "description": "This table compares retrieval accuracy across three RAG systems on the MMLU benchmark...",
  "insights": "HA-RAG achieves the highest accuracy at 95.2%, outperforming Model B (90.1%) by 5.1pp and Model A (85.4%) by 9.8pp. All models show higher performance on factual questions vs. reasoning questions. The gap between HA-RAG and competitors widens on multi-hop queries (12.3pp vs 5.1pp on single-hop)."
}`;

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Send extracted table data to the LLM for retrieval-optimised analysis.
 *
 * @param  {{ headers: string[], rows: string[][], caption: string|null }} tableData
 * @param  {number} pageNumber  1-indexed page number (for logging).
 * @returns {Promise<{ description: string, insights: string, model: string, tokensUsed: number }>}
 */
export const analyzeTable = async (tableData, pageNumber) => {
    const { headers, rows, caption } = tableData;

    // Build a readable text representation of the table
    let tableText = "";
    if (caption) {
        tableText += `Caption: ${caption}\n`;
    }
    if (headers && headers.length > 0) {
        tableText += `Headers: ${headers.join(" | ")}\n`;
    }
    if (rows && rows.length > 0) {
        tableText += `Rows (${rows.length} total):\n`;
        for (const row of rows) {
            tableText += `  ${row.join(" | ")}\n`;
        }
    }

    const t0 = Date.now();

    const response = await getClient().chat.completions.create({
        model: VISION_MODEL,
        max_tokens: 1024,
        temperature: 0.1,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
                role: "user",
                content: `Analyze the following table from page ${pageNumber} of a document. Produce a retrieval-optimized description and insights.\n\n${tableText}`,
            },
        ],
    });

    const elapsed = Date.now() - t0;
    const rawContent = response.choices?.[0]?.message?.content || "{}";
    const tokensUsed = response.usage?.total_tokens || 0;

    // ── Parse JSON — handle markdown fencing or malformed output ─────────
    let result = { description: "", insights: "" };
    try {
        const cleaned = rawContent
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .trim();
        const parsed = JSON.parse(cleaned);
        result.description = parsed.description || "";
        result.insights = parsed.insights || "";
    } catch {
        console.warn(
            `[TABLE-ANALYSIS] ⚠️ Page ${pageNumber}: JSON parse failed, attempting extraction...`
        );
        // Attempt to extract a JSON object from anywhere in the response
        const objMatch = rawContent.match(/\{[\s\S]*\}/);
        if (objMatch) {
            try {
                const parsed = JSON.parse(objMatch[0]);
                result.description = parsed.description || "";
                result.insights = parsed.insights || "";
            } catch {
                console.error(
                    `[TABLE-ANALYSIS] ❌ Page ${pageNumber}: Could not parse analysis response`
                );
                // Fall back to raw content as description
                result.description = rawContent.slice(0, 500);
            }
        } else {
            result.description = rawContent.slice(0, 500);
        }
    }

    console.log(
        `[TABLE-ANALYSIS] Page ${pageNumber}: table analysed in ${elapsed}ms ` +
            `(${tokensUsed} tokens, model: ${VISION_MODEL})`
    );

    return {
        description: result.description,
        insights: result.insights,
        model: VISION_MODEL,
        tokensUsed,
    };
};
