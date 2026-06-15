/**
 * Table Detection & Extraction Service
 *
 * Orchestrates the end-to-end table understanding pipeline:
 *   1. Pre-filter pages — skip pages with too little text content
 *   2. Render qualifying pages to PNG and send to vision model for
 *      table detection and structure extraction
 *   3. Send extracted table data to tableAnalysisService for
 *      retrieval-optimised description
 *   4. Return structured table info with ready-to-inject text snippets
 *
 * Mirrors the figureService.js architecture exactly.
 *
 * Public API:
 *   extractTables(pdfBuffer, pages)
 *     → { tables: TableInfo[], stats }
 */

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { renderPageToImage } from "../utils/pdfParser.js";
import { analyzeTable } from "./tableAnalysisService.js";
import OpenAI from "openai";
import { randomUUID } from "crypto";

// ── Configuration ─────────────────────────────────────────────────────────
const VISION_MODEL = process.env.VISION_MODEL || "gpt-4o-mini";
const MIN_PAGE_TEXT_LENGTH = 30; // Skip pages with fewer chars
const MAX_TABLES_PER_PAGE =
    parseInt(process.env.TABLE_MAX_PER_PAGE) || 10;

// ── OpenAI client (lazy singleton — matches embeddingService pattern) ─────
let client;
const getClient = () => {
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
};

// ── Vision prompt for table detection & extraction ────────────────────────
const TABLE_DETECTION_PROMPT = `You are a document analyst specializing in detecting and extracting tables from document pages.

Analyze this page image and identify ALL tables present. For each table found:

1. Extract the table structure as JSON with:
   - headers: an array of column header strings
   - rows: a 2D array of cell values (each row is an array of strings)
   - caption: any visible caption text (e.g., "Table 2: Results") or null
   - type: classify as one of: comparison, data, results, summary, statistics, configuration, schedule, reference, matrix, or other

2. Be thorough:
   - Include ALL rows and columns visible in the table
   - Preserve numerical values exactly as shown
   - Include units where visible (%, $, ms, etc.)
   - Handle merged cells by repeating the value
   - Capture sub-headers and row groups

CRITICAL RULES:
- ONLY extract actual data tables — ignore decorative borders, layout grids, or formatting structures
- If a page has no tables, return exactly: []
- Do NOT include page headers/footers, navigation elements, or non-tabular content
- Preserve the original data precision (don't round numbers)

Return a JSON array with NO markdown code fencing:
[
  {
    "type": "comparison",
    "headers": ["Model", "Accuracy", "F1 Score", "Latency (ms)"],
    "rows": [
      ["HA-RAG", "95.2%", "94.8%", "120"],
      ["Model B", "90.1%", "89.5%", "180"],
      ["Model A", "85.4%", "84.2%", "95"]
    ],
    "caption": "Table 1: Model Performance Comparison"
  }
]

If there are NO tables on this page, return exactly: []`;

// ── Page pre-filter heuristic ─────────────────────────────────────────────

/**
 * Check if a page likely contains tabular content using operator list
 * heuristics.  Looks for a combination of line-drawing operations
 * (rectangles, moveTo/lineTo) alongside structured text — patterns
 * typical of tables in PDFs.
 *
 * @param {object} page  pdfjs page object
 * @param {string} pageText  extracted text for this page
 * @returns {{ likelyHasTable: boolean, reason: string }}
 */
async function analyzePageForTables(page, pageText) {
    // Skip pages with too little text
    if (!pageText || pageText.length < MIN_PAGE_TEXT_LENGTH) {
        return { likelyHasTable: false, reason: "insufficient text" };
    }

    let ops;
    try {
        ops = await page.getOperatorList();
    } catch {
        // If we can't get the operator list, still try if there's enough text
        return {
            likelyHasTable: pageText.length > 100,
            reason: "operator list unavailable, falling back to text length",
        };
    }

    // Count line-drawing operations (common in table borders)
    let lineOps = 0;
    let rectOps = 0;

    for (let i = 0; i < ops.fnArray.length; i++) {
        const op = ops.fnArray[i];
        if (
            op === pdfjsLib.OPS.moveTo ||
            op === pdfjsLib.OPS.lineTo
        ) {
            lineOps++;
        }
        if (op === pdfjsLib.OPS.rectangle) {
            rectOps++;
        }
    }

    // Heuristic 1: Page has line-drawing operations suggestive of table borders
    if (lineOps > 10 || rectOps > 3) {
        return {
            likelyHasTable: true,
            reason: `${lineOps} line ops, ${rectOps} rect ops`,
        };
    }

    // Heuristic 2: Text contains patterns suggestive of tabular data
    // Look for multiple numbers, repeated whitespace-separated structures
    const lines = pageText.split("\n").filter((l) => l.trim().length > 0);
    let linesWithMultipleNumbers = 0;
    const numberPattern = /\d+\.?\d*/g;

    for (const line of lines) {
        const numbers = line.match(numberPattern);
        if (numbers && numbers.length >= 3) {
            linesWithMultipleNumbers++;
        }
    }

    if (linesWithMultipleNumbers >= 3) {
        return {
            likelyHasTable: true,
            reason: `${linesWithMultipleNumbers} lines with multiple numbers`,
        };
    }

    // Heuristic 3: Check for column-like structure via text items
    try {
        const textContent = await page.getTextContent();
        const items = textContent.items.filter(
            (item) => item.str && item.str.trim().length > 0
        );

        if (items.length > 10) {
            // Group items by approximate x-coordinate (suggesting columns)
            const xBuckets = new Map();
            for (const item of items) {
                const xBucket = Math.round(item.transform[4] / 20) * 20;
                xBuckets.set(xBucket, (xBuckets.get(xBucket) || 0) + 1);
            }

            // If 3+ x-positions each have 3+ items, looks columnar
            const columnarBuckets = [...xBuckets.values()].filter(
                (count) => count >= 3
            );
            if (columnarBuckets.length >= 3) {
                return {
                    likelyHasTable: true,
                    reason: `${columnarBuckets.length} column-like text groups`,
                };
            }
        }
    } catch {
        // Text content analysis failed, not fatal
    }

    return { likelyHasTable: false, reason: "no table indicators found" };
}

// ── Vision model: detect and extract tables ───────────────────────────────

/**
 * Send a rendered page image to the vision model to detect and extract
 * table structures.
 *
 * @param {Buffer} imageBuffer  PNG image of the rendered PDF page.
 * @param {number} pageNumber   1-indexed page number.
 * @returns {Promise<{ tables: Array, model: string, tokensUsed: number }>}
 */
async function detectTablesOnPage(imageBuffer, pageNumber) {
    const base64 = imageBuffer.toString("base64");
    const t0 = Date.now();

    const response = await getClient().chat.completions.create({
        model: VISION_MODEL,
        max_tokens: 2048,
        temperature: 0.1,
        messages: [
            { role: "system", content: TABLE_DETECTION_PROMPT },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Analyze page ${pageNumber} of the document. Identify all tables and extract their complete structure (headers, rows, caption, type).`,
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
    let tables = [];
    try {
        const cleaned = rawContent
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .trim();
        const parsed = JSON.parse(cleaned);
        tables = Array.isArray(parsed)
            ? parsed.slice(0, MAX_TABLES_PER_PAGE)
            : [];
    } catch {
        console.warn(
            `[TABLES] ⚠️ Page ${pageNumber}: JSON parse failed, attempting extraction...`
        );
        const arrayMatch = rawContent.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            try {
                tables = JSON.parse(arrayMatch[0]).slice(
                    0,
                    MAX_TABLES_PER_PAGE
                );
            } catch {
                console.error(
                    `[TABLES] ❌ Page ${pageNumber}: Could not parse vision response`
                );
            }
        }
    }

    console.log(
        `[TABLES] Page ${pageNumber}: ${tables.length} table(s) detected in ${elapsed}ms ` +
            `(${tokensUsed} tokens, model: ${VISION_MODEL})`
    );

    return { tables, model: VISION_MODEL, tokensUsed };
}

// ── Text-snippet builder ──────────────────────────────────────────────────

/**
 * Build a clearly-delimited text snippet for a table.
 * This snippet is injected into the page text so it flows through
 * chunkText() and becomes retrievable via embedding search.
 */
function buildTableSnippet(tableId, pageNumber, tableData, analysis) {
    const typeLabel = (tableData.type || "data")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    // Combine analysis description and insights into a rich searchable snippet
    let snippet = `[Table (Page ${pageNumber}) — ${typeLabel} | ID: ${tableId}]: `;

    if (analysis.insights) {
        snippet += analysis.insights;
    } else if (analysis.description) {
        snippet += analysis.description;
    }

    if (tableData.caption) {
        snippet += ` Caption: "${tableData.caption}."`;
    }

    return snippet;
}

// ── Main export ───────────────────────────────────────────────────────────

/**
 * Extract and describe all tables from a PDF.
 *
 * @param  {Buffer|Uint8Array} pdfBuffer  Raw PDF bytes.
 * @param  {Array}             pages      Page info from extractTextFromPDF().
 * @returns {Promise<{
 *   tables: Array<{
 *     tableId: string, pageNumber: number, type: string,
 *     description: string, insights: string, headers: string[],
 *     rows: string[][], caption: string|null, textSnippet: string,
 *     visionModel: string
 *   }>,
 *   stats: { pagesAnalyzed: number, pagesWithTables: number,
 *            totalTables: number, pagesSkipped: number }
 * }>}
 */
export const extractTables = async (pdfBuffer, pages) => {
    const data = new Uint8Array(pdfBuffer);
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    const tables = [];
    const stats = {
        pagesAnalyzed: 0,
        pagesWithTables: 0,
        totalTables: 0,
        pagesSkipped: 0,
    };

    // Build a map of page text from the pages array for heuristic checks
    const pageTextMap = new Map();
    for (const p of pages) {
        pageTextMap.set(p.pageNumber, p.text || "");
    }

    console.log(`[TABLES] Analysing ${pdf.numPages} page(s) for tables...`);

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const pageText = pageTextMap.get(i) || "";

        try {
            // ── Stage 1: Heuristic pre-filter (zero API cost) ───────────
            const analysis = await analyzePageForTables(page, pageText);
            stats.pagesAnalyzed++;

            if (!analysis.likelyHasTable) {
                stats.pagesSkipped++;
                continue;
            }

            console.log(
                `[TABLES] Page ${i}: likely has table (${analysis.reason}) — sending to vision model...`
            );

            // ── Stage 2: Render + vision model for table detection ──────
            try {
                const imageBuffer = await renderPageToImage(page);
                const {
                    tables: pageTables,
                    model,
                    tokensUsed,
                } = await detectTablesOnPage(imageBuffer, i);

                if (pageTables.length === 0) {
                    console.log(
                        `[TABLES] Page ${i}: vision model found no tables`
                    );
                    stats.pagesSkipped++;
                    continue;
                }

                stats.pagesWithTables++;

                // ── Stage 3: Analyse each table for rich descriptions ───
                for (const tbl of pageTables) {
                    const tableId = `tbl_${randomUUID().slice(0, 12)}`;

                    const tableData = {
                        headers: tbl.headers || [],
                        rows: tbl.rows || [],
                        caption: tbl.caption || null,
                    };

                    // Get retrieval-optimised analysis
                    let analysisResult;
                    try {
                        analysisResult = await analyzeTable(tableData, i);
                    } catch (analysisErr) {
                        console.warn(
                            `[TABLES] ⚠️ Page ${i}: table analysis failed, using basic description: ${analysisErr.message}`
                        );
                        analysisResult = {
                            description: `Table with ${tableData.headers.length} columns and ${tableData.rows.length} rows.`,
                            insights: "",
                            model: VISION_MODEL,
                            tokensUsed: 0,
                        };
                    }

                    const textSnippet = buildTableSnippet(
                        tableId,
                        i,
                        tbl,
                        analysisResult
                    );

                    tables.push({
                        tableId,
                        pageNumber: i,
                        type: tbl.type || "data",
                        description: analysisResult.description,
                        insights: analysisResult.insights,
                        headers: tableData.headers,
                        rows: tableData.rows,
                        caption: tableData.caption,
                        textSnippet,
                        visionModel: model,
                    });

                    stats.totalTables++;
                }

                console.log(
                    `[TABLES] Page ${i}: ${pageTables.length} table(s) extracted and analysed (${tokensUsed} vision tokens)`
                );
            } catch (visionErr) {
                console.error(
                    `[TABLES] ❌ Page ${i} vision processing failed: ${visionErr.message}`
                );
                stats.pagesSkipped++;
            }
        } catch (pageErr) {
            console.error(
                `[TABLES] ❌ Page ${i} analysis failed: ${pageErr.message}`
            );
            stats.pagesSkipped++;
        }
    }

    console.log(
        `[TABLES] ✅ Complete — ${stats.pagesAnalyzed} pages analysed, ` +
            `${stats.pagesWithTables} with tables, ${stats.totalTables} total table(s)`
    );

    return { tables, stats };
};
