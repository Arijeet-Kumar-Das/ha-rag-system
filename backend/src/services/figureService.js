/**
 * Figure Detection & Description Service
 *
 * Orchestrates the end-to-end figure understanding pipeline:
 *   1. Analyse each PDF page for meaningful image objects (heuristic pre-filter)
 *   2. Filter out decorative / small images (size + area + aspect ratio)
 *   3. Render qualifying pages to PNG and send to vision model
 *   4. Return structured figure descriptions with ready-to-inject text snippets
 *
 * Public API:
 *   extractFigures(pdfBuffer, pages)
 *     → { figures: FigureInfo[], stats }
 */

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { renderPageToImage } from "../utils/pdfParser.js";
import { describePageFigures } from "./visionService.js";
import { randomUUID } from "crypto";

// ── Configuration ─────────────────────────────────────────────────────────
const FIGURE_MIN_DIMENSION =
    parseInt(process.env.FIGURE_MIN_DIMENSION) || 100;
const FIGURE_MIN_AREA_RATIO =
    parseFloat(process.env.FIGURE_MIN_AREA_RATIO) || 0.02;

// ── Page analysis ─────────────────────────────────────────────────────────

/**
 * Analyse a page's operator list to detect meaningful image objects.
 * Estimates rendered image dimensions from the preceding transformation
 * matrix (CTM) to distinguish real figures from decorative icons.
 *
 * @returns {{ hasMeaningfulFigures: boolean, totalImages: number, meaningfulImages: number }}
 */
async function analyzePageForFigures(page) {
    const viewport = page.getViewport({ scale: 1.0 });
    const pageArea = viewport.width * viewport.height;

    let ops;
    try {
        ops = await page.getOperatorList();
    } catch {
        return {
            hasMeaningfulFigures: false,
            totalImages: 0,
            meaningfulImages: 0,
        };
    }

    const imageOpCodes = new Set([
        pdfjsLib.OPS.paintImageXObject,
        pdfjsLib.OPS.paintJpegXObject,
    ]);

    let totalImages = 0;
    let meaningfulImages = 0;

    for (let i = 0; i < ops.fnArray.length; i++) {
        if (!imageOpCodes.has(ops.fnArray[i])) continue;
        totalImages++;

        // Walk backwards to find the nearest transform that sets up this
        // image's dimensions.  Typical PDF pattern:
        //   save → transform [w,0,0,h,x,y] → paintImageXObject → restore
        let width = 0;
        let height = 0;

        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
            if (ops.fnArray[j] === pdfjsLib.OPS.transform) {
                const args = ops.argsArray[j];
                // CTM = [a, b, c, d, e, f]
                // rendered width  ≈ √(a² + b²)
                // rendered height ≈ √(c² + d²)
                width = Math.sqrt(args[0] ** 2 + args[1] ** 2);
                height = Math.sqrt(args[2] ** 2 + args[3] ** 2);
                break;
            }
        }

        // If no transform found, include as potentially meaningful
        // (conservative — let the vision model decide)
        if (width === 0 && height === 0) {
            meaningfulImages++;
            continue;
        }

        const minDim = Math.min(width, height);
        const imageArea = width * height;
        const areaRatio = imageArea / pageArea;
        const aspectRatio = Math.max(width, height) / (minDim || 1);

        // ── Decorative-image filters ────────────────────────────────
        if (minDim < FIGURE_MIN_DIMENSION) continue; // icons, bullets
        if (areaRatio < FIGURE_MIN_AREA_RATIO) continue; // tiny relative to page
        if (aspectRatio > 15) continue; // thin decorative lines / borders

        meaningfulImages++;
    }

    return { hasMeaningfulFigures: meaningfulImages > 0, totalImages, meaningfulImages };
}

// ── Text-snippet builder ──────────────────────────────────────────────────

/**
 * Build a clearly-delimited text snippet for a figure.
 * This snippet is injected into the page text so it flows through
 * chunkText() and becomes retrievable via embedding search.
 */
function buildFigureSnippet(figureId, pageNumber, figureData) {
    const typeLabel = (figureData.type || "figure")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    let snippet = `[Figure (Page ${pageNumber}) — ${typeLabel} | ID: ${figureId}]: ${figureData.description}`;

    if (figureData.caption) {
        snippet += ` Caption: "${figureData.caption}."`;
    }

    if (figureData.labels && figureData.labels.length > 0) {
        snippet += ` Labels: ${figureData.labels.join("; ")}.`;
    }

    return snippet;
}

// ── Main export ───────────────────────────────────────────────────────────

/**
 * Extract and describe all meaningful figures from a PDF.
 *
 * @param  {Buffer|Uint8Array} pdfBuffer  Raw PDF bytes.
 * @param  {Array}             pages      Page info from extractTextFromPDF().
 * @returns {Promise<{
 *   figures: Array<{
 *     figureId: string, pageNumber: number, type: string,
 *     description: string, caption: string|null, labels: string[],
 *     textSnippet: string, visionModel: string
 *   }>,
 *   stats: { pagesAnalyzed: number, pagesWithFigures: number,
 *            totalFigures: number, pagesSkipped: number }
 * }>}
 */
export const extractFigures = async (pdfBuffer, pages) => {
    const data = new Uint8Array(pdfBuffer);
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    const figures = [];
    const stats = {
        pagesAnalyzed: 0,
        pagesWithFigures: 0,
        totalFigures: 0,
        pagesSkipped: 0,
    };

    console.log(`[FIGURES] Analysing ${pdf.numPages} page(s) for figures...`);

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        try {
            // ── Stage 1: Heuristic pre-filter (zero API cost) ───────────
            const analysis = await analyzePageForFigures(page);
            stats.pagesAnalyzed++;

            if (!analysis.hasMeaningfulFigures) {
                if (analysis.totalImages > 0) {
                    console.log(
                        `[FIGURES] Page ${i}: ${analysis.totalImages} image(s) — all decorative, skipping`
                    );
                }
                stats.pagesSkipped++;
                continue;
            }

            console.log(
                `[FIGURES] Page ${i}: ${analysis.meaningfulImages}/${analysis.totalImages} meaningful image(s) — sending to vision model...`
            );

            // ── Stage 2: Render + vision model ──────────────────────────
            try {
                const imageBuffer = await renderPageToImage(page);
                const {
                    figures: pageFigures,
                    model,
                    tokensUsed,
                } = await describePageFigures(imageBuffer, i);

                if (pageFigures.length === 0) {
                    console.log(
                        `[FIGURES] Page ${i}: vision model found no meaningful figures`
                    );
                    stats.pagesSkipped++;
                    continue;
                }

                stats.pagesWithFigures++;

                for (const fig of pageFigures) {
                    const figureId = `fig_${randomUUID().slice(0, 12)}`;
                    const textSnippet = buildFigureSnippet(figureId, i, fig);

                    figures.push({
                        figureId,
                        pageNumber: i,
                        type: fig.type || "unknown",
                        description: fig.description || "",
                        caption: fig.caption || null,
                        labels: fig.labels || [],
                        textSnippet,
                        visionModel: model,
                    });

                    stats.totalFigures++;
                }

                console.log(
                    `[FIGURES] Page ${i}: ${pageFigures.length} figure(s) described (${tokensUsed} tokens)`
                );
            } catch (visionErr) {
                console.error(
                    `[FIGURES] ❌ Page ${i} vision processing failed: ${visionErr.message}`
                );
                stats.pagesSkipped++;
            }
        } catch (pageErr) {
            console.error(
                `[FIGURES] ❌ Page ${i} analysis failed: ${pageErr.message}`
            );
            stats.pagesSkipped++;
        }
    }

    console.log(
        `[FIGURES] ✅ Complete — ${stats.pagesAnalyzed} pages analysed, ` +
            `${stats.pagesWithFigures} with figures, ${stats.totalFigures} total figure(s)`
    );

    return { figures, stats };
};
