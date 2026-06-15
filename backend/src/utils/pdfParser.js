import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { recognizeImage } from "../services/ocrService.js";

// ── Configuration ─────────────────────────────────────────────────────────
const OCR_TEXT_THRESHOLD = parseInt(process.env.OCR_TEXT_THRESHOLD) || 50;
const OCR_DENSITY_THRESHOLD =
    parseFloat(process.env.OCR_DENSITY_THRESHOLD) || 0.005;
const PAGE_RENDER_SCALE = parseFloat(process.env.OCR_RENDER_SCALE) || 2.0;

// ── Canvas helpers (lazy-loaded so text-only paths never import canvas) ──
let _createCanvas = null;

/**
 * Lazy-load the same canvas implementation that pdfjs-dist uses in Node.
 *
 * Mixing Automattic/node-canvas with pdfjs-dist's @napi-rs/canvas objects
 * causes node-canvas drawImage() to throw "Image or Canvas expected".
 * Returns null (with a warning) when the package is missing so
 * pure-text PDFs still work without native dependencies.
 */
const getCreateCanvas = async () => {
    if (_createCanvas !== null) return _createCanvas;

    try {
        const canvasModule = await import("@napi-rs/canvas");
        _createCanvas = canvasModule.createCanvas;

        // Keep PDF.js geometry/image globals from the same canvas backend.
        if (!globalThis.DOMMatrix && canvasModule.DOMMatrix) {
            globalThis.DOMMatrix = canvasModule.DOMMatrix;
        }
        if (!globalThis.ImageData && canvasModule.ImageData) {
            globalThis.ImageData = canvasModule.ImageData;
        }
        if (!globalThis.Path2D && canvasModule.Path2D) {
            globalThis.Path2D = canvasModule.Path2D;
        }

        return _createCanvas;
    } catch {
        console.warn(
            "[PDF-PARSER] ⚠️ '@napi-rs/canvas' package not installed — OCR rendering unavailable. " +
                "Run: npm install @napi-rs/canvas"
        );
        _createCanvas = false; // false = tried & failed
        return false;
    }
};

// ── Page analysis ─────────────────────────────────────────────────────────

/**
 * Decide whether a page needs OCR by combining three heuristics:
 *   1. Very little extractable text  (< OCR_TEXT_THRESHOLD chars)
 *   2. Low text-density relative to page area + images present
 *   3. Page contains large image objects (figures, scanned content)
 *
 * @returns {{ needsOCR: boolean, reason: string|null }}
 */
async function shouldRunOCR(page, textContent) {
    const text = textContent.items.map((item) => item.str).join(" ").trim();
    const charCount = text.length;

    // 1 — Almost no text → certainly scanned
    if (charCount < OCR_TEXT_THRESHOLD) {
        return {
            needsOCR: true,
            reason: `low text count (${charCount} chars < ${OCR_TEXT_THRESHOLD} threshold)`,
        };
    }

    // 2+3 — Text density check combined with image-object detection
    const viewport = page.getViewport({ scale: 1.0 });
    const pageArea = viewport.width * viewport.height;
    const textDensity = charCount / pageArea;

    let imageCount = 0;
    try {
        const ops = await page.getOperatorList();
        const imageOpCodes = new Set([
            pdfjsLib.OPS.paintImageXObject,
            pdfjsLib.OPS.paintJpegXObject,
            pdfjsLib.OPS.paintImageMaskXObject,
        ]);
        imageCount = ops.fnArray.filter((fn) => imageOpCodes.has(fn)).length;
    } catch {
        // operator list unavailable — conservative fallback: no OCR
    }

    if (textDensity < OCR_DENSITY_THRESHOLD && imageCount > 0) {
        return {
            needsOCR: true,
            reason: `low density (${textDensity.toFixed(
                5
            )}) with ${imageCount} image object(s)`,
        };
    }

    return { needsOCR: false, reason: null };
}

// ── Page rendering ────────────────────────────────────────────────────────

/**
 * Render a single PDF page to an in-memory PNG buffer.
 * Uses @napi-rs/canvas, matching pdfjs-dist's Node rendering backend.
 */
export async function renderPageToImage(page, scale) {
    const createCanvas = await getCreateCanvas();
    if (!createCanvas) {
        throw new Error(
            "'@napi-rs/canvas' is required for OCR rendering but is not installed"
        );
    }

    const renderScale = scale ?? PAGE_RENDER_SCALE;
    const viewport = page.getViewport({ scale: renderScale });
    const width = Math.floor(viewport.width);
    const height = Math.floor(viewport.height);

    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    // pdfjs-dist needs a CanvasFactory when running in Node.
    const canvasFactory = {
        create(w, h) {
            const c = createCanvas(w, h);
            return { canvas: c, context: c.getContext("2d") };
        },
        reset(pair, w, h) {
            pair.canvas.width = w;
            pair.canvas.height = h;
        },
        destroy(pair) {
            pair.canvas.width = 0;
            pair.canvas.height = 0;
        },
    };

    await page.render({ canvasContext: context, viewport, canvasFactory })
        .promise;

    return canvas.toBuffer("image/png");
}

// ── Main export ───────────────────────────────────────────────────────────

/**
 * Extract text from a PDF buffer with intelligent OCR fallback.
 *
 * Returns structured data so callers can access:
 *   • fullText — concatenated text (drop-in replacement for the old API)
 *   • pages[] — per-page text + extraction metadata
 *   • stats   — aggregate OCR statistics
 *
 * @param  {Buffer|Uint8Array} pdfBuffer  Raw PDF bytes.
 * @returns {Promise<{
 *   fullText : string,
 *   pages    : Array<{ pageNumber: number, text: string, method: 'text'|'ocr', confidence: number|null, charCount: number }>,
 *   stats    : { totalPages: number, textPages: number, ocrPages: number, failedPages: number }
 * }>}
 */
export const extractTextFromPDF = async (pdfBuffer) => {
    const data = new Uint8Array(pdfBuffer);
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    const pages = [];
    const stats = {
        totalPages: pdf.numPages,
        textPages: 0,
        ocrPages: 0,
        failedPages: 0,
    };

    console.log(`[PDF-PARSER] Processing ${pdf.numPages} page(s)...`);

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        try {
            // ── Extract whatever selectable text exists ──────────────────
            const textContent = await page.getTextContent();
            const directText = textContent.items
                .map((item) => item.str)
                .join(" ")
                .trim();

            // ── Decide whether OCR is needed ────────────────────────────
            const { needsOCR, reason } = await shouldRunOCR(page, textContent);

            if (!needsOCR) {
                // ── Normal text extraction ──────────────────────────────
                console.log(
                    `[PDF-PARSER] Page ${i}/${pdf.numPages}: text extraction (${directText.length} chars)`
                );
                pages.push({
                    pageNumber: i,
                    text: directText,
                    method: "text",
                    confidence: null,
                    charCount: directText.length,
                    isOcrPage: false,
                });
                stats.textPages++;
                continue;
            }

            // ── OCR fallback ────────────────────────────────────────────
            console.log(
                `[PDF-PARSER] Page ${i}/${pdf.numPages}: ${reason} → running OCR...`
            );

            try {
                const imageBuffer = await renderPageToImage(page);
                const { text: ocrText, confidence } =
                    await recognizeImage(imageBuffer);
                const cleaned = ocrText.trim();

                // Merge: keep OCR text as primary, append direct text if it
                // carries unique content (e.g. text overlays on scanned pages).
                let combined = cleaned;
                if (directText.length > 10 && cleaned.length > 0) {
                    const dWords = new Set(
                        directText.toLowerCase().split(/\s+/)
                    );
                    const oWords = new Set(cleaned.toLowerCase().split(/\s+/));
                    let hits = 0;
                    for (const w of dWords) if (oWords.has(w)) hits++;

                    if (dWords.size > 0 && hits / dWords.size < 0.5) {
                        combined = `${cleaned}\n${directText}`;
                    }
                }

                console.log(
                    `[OCR] Page ${i}: ${cleaned.length} chars, confidence: ${confidence.toFixed(
                        1
                    )}%`
                );

                console.log(
                    `[OCR-DIAG] Page ${i}: OCR extracted ${cleaned.length} chars, ` +
                        `confidence: ${confidence.toFixed(1)}%, ` +
                        `direct text: ${directText.length} chars, ` +
                        `combined: ${combined.length} chars`
                );

                pages.push({
                    pageNumber: i,
                    text: combined,
                    method: "ocr",
                    confidence,
                    charCount: combined.length,
                    isOcrPage: true,
                });
                stats.ocrPages++;
            } catch (ocrErr) {
                console.error(
                    `[OCR] ❌ Page ${i} failed: ${ocrErr.message}`
                );

                // Fall back to whatever direct text we managed to get.
                if (directText.length > 0) {
                    pages.push({
                        pageNumber: i,
                        text: directText,
                        method: "text",
                        confidence: null,
                        charCount: directText.length,
                        isOcrPage: false,
                    });
                    stats.textPages++;
                } else {
                    stats.failedPages++;
                }
            }
        } catch (pageErr) {
            console.error(
                `[PDF-PARSER] ❌ Page ${i} processing error: ${pageErr.message}`
            );
            stats.failedPages++;
        }
    }

    // Assemble the flat string the rest of the pipeline expects.
    const fullText = pages.map((p) => p.text).join("\n");

    console.log(
        `[PDF-PARSER] ✅ Complete — ${stats.totalPages} page(s): ` +
            `${stats.textPages} text, ${stats.ocrPages} OCR, ${stats.failedPages} failed`
    );

    return { fullText, pages, stats };
};
