/**
 * Modular OCR Service
 *
 * Encapsulates OCR behind a provider-agnostic interface.
 * Currently backed by Tesseract.js (WASM) — can be swapped
 * with a vision-model API (GPT-4V, Gemini, etc.) by replacing
 * the `recognizeImage` implementation without touching consumers.
 *
 * Public API:
 *   recognizeImage(imageBuffer)  → { text, confidence }
 *   initializeOCR()              → warm-start the engine
 *   terminateOCRWorker()         → graceful shutdown
 */

import { createWorker } from "tesseract.js";

// ── Configuration ─────────────────────────────────────────────────────────
const OCR_LANGUAGE = process.env.OCR_LANGUAGE || "eng";

// ── Worker lifecycle ──────────────────────────────────────────────────────
let worker = null;
let initPromise = null;

/**
 * Lazily create (or return the existing) Tesseract worker.
 * Thread-safe: concurrent callers share the same init promise.
 */
const ensureWorker = async () => {
    if (worker) return worker;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        console.log(
            `[OCR] Initializing Tesseract.js worker (language: ${OCR_LANGUAGE})...`
        );
        const t0 = Date.now();

        const w = await createWorker(OCR_LANGUAGE, 1, {
            // Uncomment for per-page progress during debugging:
            // logger: m => console.log(`[OCR-DBG] ${m.status}: ${Math.round(m.progress * 100)}%`)
        });

        worker = w;
        initPromise = null;

        console.log(`[OCR] ✅ Worker ready (${Date.now() - t0}ms)`);
        return worker;
    })();

    return initPromise;
};

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Run OCR on an in-memory image.
 *
 * @param  {Buffer}  imageBuffer  PNG or JPEG image bytes.
 * @returns {Promise<{ text: string, confidence: number }>}
 *          confidence is Tesseract's mean word confidence (0-100).
 */
export const recognizeImage = async (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) && !(imageBuffer instanceof Uint8Array)) {
        throw new TypeError(
            "OCR input must be a PNG/JPEG Buffer or Uint8Array"
        );
    }

    const w = await ensureWorker();
    const { data } = await w.recognize(imageBuffer);

    return {
        text: data.text || "",
        confidence: data.confidence ?? 0,
    };
};

/**
 * Pre-warm the OCR engine.
 * Optional — the worker is also lazily initialized on first use.
 */
export const initializeOCR = async () => {
    await ensureWorker();
};

/**
 * Terminate the Tesseract worker and free resources.
 * Call during graceful server shutdown.
 */
export const terminateOCRWorker = async () => {
    if (worker) {
        console.log("[OCR] Terminating worker...");
        await worker.terminate();
        worker = null;
        console.log("[OCR] Worker terminated");
    }
};
