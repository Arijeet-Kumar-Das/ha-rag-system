/**
 * Vision Service
 *
 * Provider-agnostic vision model interface for semantic figure understanding.
 * Currently backed by OpenAI (GPT-4o-mini / GPT-4o) — designed to be
 * swappable with Gemini, Claude Vision, or a local model by replacing
 * the `describePageFigures` implementation without touching consumers.
 *
 * Public API:
 *   describePageFigures(imageBuffer, pageNumber)
 *     → { figures: FigureDescription[], model: string, tokensUsed: number }
 */

import OpenAI from "openai";

// ── Configuration ─────────────────────────────────────────────────────────
const VISION_MODEL = process.env.VISION_MODEL || "gpt-4o-mini";
const MAX_FIGURES_PER_PAGE =
    parseInt(process.env.FIGURE_MAX_PER_PAGE) || 10;

// ── OpenAI client (lazy singleton — matches embeddingService pattern) ─────
let client;
const getClient = () => {
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
};

// ── Retrieval-optimised system prompt ─────────────────────────────────────
const SYSTEM_PROMPT = `You are a research document analyst specializing in extracting structured, retrieval-optimized descriptions from visual elements in academic and technical documents.

For each meaningful figure, chart, diagram, graph, table, flowchart, screenshot, or visual element on the page:

1. DESCRIBE with retrieval-optimized language that maximizes future search and question-answering quality:
   - State specific numerical values, percentages, and measurements visible in the figure
   - Describe trends explicitly (increasing, decreasing, stable, exponential, linear, logarithmic)
   - Highlight comparisons between items (e.g., "A outperforms B by 5.2 percentage points")
   - Note relationships, correlations, causation, and dependencies
   - Extract ALL visible text labels, axis labels, legend entries, and annotations
   - State conclusions and insights that can be inferred from the data
   - If a table is present, transcribe key column/row headers and representative values
   - Describe the methodology or experimental setup if depicted in a diagram

2. CLASSIFY the visual type: bar_chart, line_chart, pie_chart, scatter_plot, histogram, heatmap, box_plot, confusion_matrix, roc_curve, diagram, flowchart, architecture_diagram, network_diagram, sequence_diagram, state_diagram, table, photo, screenshot, map, equation, pseudocode, or other.

3. EXTRACT any visible caption text verbatim (e.g., "Figure 3: Comparison of Model Accuracy").

CRITICAL RULES:
- IGNORE: page numbers, headers, footers, logos, watermarks, bullet icons, decorative borders, background patterns, small inline icons, navigation elements, pagination
- Write as if explaining to a researcher who cannot see the image but must answer factual questions about the data
- Be specific and quantitative — prefer "accuracy increased from 85.4% to 95.2% (a 9.8pp improvement)" over "accuracy improved significantly"
- Describe visual encodings (colors, patterns, marker shapes) ONLY when they carry semantic meaning (e.g., "blue represents Model A, red represents Model B")
- Each description must be self-contained and independently useful for information retrieval
- For multi-panel figures, describe each panel separately within the same description

Return a JSON array with NO markdown code fencing:
[
  {
    "type": "bar_chart",
    "description": "The bar chart compares retrieval accuracy across three systems. HA-RAG achieves the highest accuracy at 95.2% (±1.2%), outperforming Model B at 90.1% (±2.0%) and Model A at 85.4% (±3.1%). The y-axis ranges from 0% to 100%. Error bars indicate standard deviation across 5 runs. HA-RAG shows both the best mean performance and the lowest variance.",
    "caption": "Figure 3: Retrieval Accuracy Comparison",
    "labels": ["x-axis: System", "y-axis: Accuracy (%)", "HA-RAG: 95.2%", "Model B: 90.1%", "Model A: 85.4%"]
  }
]

If there are NO meaningful figures on this page, return exactly: []`;

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Send a rendered page image to the vision model and get structured,
 * retrieval-optimised descriptions of all meaningful figures.
 *
 * @param  {Buffer} imageBuffer  PNG image of the rendered PDF page.
 * @param  {number} pageNumber   1-indexed page number (for logging).
 * @returns {Promise<{ figures: Array, model: string, tokensUsed: number }>}
 */
export const describePageFigures = async (imageBuffer, pageNumber) => {
    const base64 = imageBuffer.toString("base64");
    const t0 = Date.now();

    const response = await getClient().chat.completions.create({
        model: VISION_MODEL,
        max_tokens: 2048,
        temperature: 0.1,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Analyze page ${pageNumber} of the document. Identify and describe all meaningful figures, charts, diagrams, tables, and visual elements. Return retrieval-optimized descriptions with specific data values and inferred conclusions.`,
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/png;base64,${base64}`,
                            detail: "high",
                        },
                    },
                ],
            },
        ],
    });

    const elapsed = Date.now() - t0;
    const rawContent = response.choices?.[0]?.message?.content || "[]";
    const tokensUsed = response.usage?.total_tokens || 0;

    // ── Parse JSON — handle markdown fencing or malformed output ─────────
    let figures = [];
    try {
        const cleaned = rawContent
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .trim();
        const parsed = JSON.parse(cleaned);
        figures = Array.isArray(parsed)
            ? parsed.slice(0, MAX_FIGURES_PER_PAGE)
            : [];
    } catch {
        console.warn(
            `[VISION] ⚠️ Page ${pageNumber}: JSON parse failed, attempting extraction...`
        );
        // Attempt to extract a JSON array from anywhere in the response
        const arrayMatch = rawContent.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            try {
                figures = JSON.parse(arrayMatch[0]).slice(
                    0,
                    MAX_FIGURES_PER_PAGE
                );
            } catch {
                console.error(
                    `[VISION] ❌ Page ${pageNumber}: Could not parse vision response`
                );
            }
        }
    }

    console.log(
        `[VISION] Page ${pageNumber}: ${figures.length} figure(s) described in ${elapsed}ms ` +
            `(${tokensUsed} tokens, model: ${VISION_MODEL})`
    );

    return { figures, model: VISION_MODEL, tokensUsed };
};
