/**
 * Chunk ↔ Page + Figure + Table Metadata Annotator
 *
 * After chunkText() produces content-only chunks, this module maps each
 * chunk back to its source PDF pages AND figure/table descriptions using
 * word-set overlap + pattern matching.  It annotates every chunk with:
 *
 *   - extractionMethod  ('text' | 'ocr' | 'figure' | 'table' | 'mixed')
 *   - ocrConfidence     (average Tesseract confidence, or null)
 *   - sourcePages       (array of contributing page numbers)
 *   - figureIds         (array of figure IDs whose descriptions appear in this chunk)
 *   - hasFigureContent  (boolean — true if chunk contains figure description text)
 *   - tableIds          (array of table IDs whose descriptions appear in this chunk)
 *   - hasTableContent   (boolean — true if chunk contains table description text)
 *
 * This keeps the chunker 100 % unchanged while preserving provenance for
 * downstream features (multimodal retrieval, confidence filtering, etc.).
 */

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Build a Set of normalised words (length > 2) for fast overlap checks.
 */
const buildWordSet = (text, minWordLength = 3) => {
    if (!text) return new Set();
    return new Set(
        text
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length >= minWordLength)
    );
};

/**
 * Fraction of words in setA that also appear in setB.
 */
const wordOverlap = (setA, setB) => {
    if (setA.size === 0) return 0;
    let hits = 0;
    for (const w of setA) {
        if (setB.has(w)) hits++;
    }
    return hits / setA.size;
};

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Annotate an array of chunks with extraction-source metadata drawn from
 * the per-page information and optional figure/table descriptions.
 *
 * Mutates `chunks[].metadata` in-place **and** returns the array.
 *
 * @param {Array<{ content: string, metadata: object }>} chunks
 *        Output of chunkText().
 * @param {Array<{ pageNumber: number, text: string, method: string,
 *                 confidence: number|null, hasFigures?: boolean, figureIds?: string[],
 *                 hasTables?: boolean, tableIds?: string[] }>} pages
 *        Per-page data (optionally enriched with figure and table metadata).
 * @param {Array<{ figureId: string, pageNumber: number, textSnippet: string }>} figures
 *        Figure data from extractFigures() (optional — default []).
 * @param {Array<{ tableId: string, pageNumber: number, textSnippet: string }>} tables
 *        Table data from extractTables() (optional — default []).
 * @returns {Array<{ content: string, metadata: object }>}
 */
export const annotateChunksWithPageMetadata = (
    chunks,
    pages,
    figures = [],
    tables = []
) => {
    if (!pages || pages.length === 0) return chunks;

    // Pre-compute word sets for all pages.
    // Use shorter minimum word length for OCR pages (OCR text has many
    // short tokens like field labels, abbreviations, and numbers).
    const pageSets = pages.map((p) => ({
        pageNumber: p.pageNumber,
        method: p.method,
        confidence: p.confidence,
        isOcrPage: p.isOcrPage || p.method === "ocr",
        words: buildWordSet(p.text, p.isOcrPage || p.method === "ocr" ? 2 : 3),
    }));

    // Pre-compute word sets for figure snippets.
    const figureSets = figures.map((f) => ({
        figureId: f.figureId,
        pageNumber: f.pageNumber,
        words: buildWordSet(f.textSnippet),
    }));

    // Pre-compute word sets for table snippets.
    const tableSets = tables.map((t) => ({
        tableId: t.tableId,
        pageNumber: t.pageNumber,
        words: buildWordSet(t.textSnippet),
    }));

    // Pattern to extract figure IDs directly from chunk text.
    const figureIdPattern = /\bID:\s*(fig_[a-z0-9]+)\b/gi;

    // Pattern to extract table IDs directly from chunk text.
    const tableIdPattern = /\bID:\s*(tbl_[a-z0-9]+)\b/gi;

    for (const chunk of chunks) {
        const chunkWords = buildWordSet(chunk.content);
        if (chunkWords.size === 0) continue;

        // ── Page overlap (Phase 1 logic — unchanged) ────────────────────
        const contributors = [];

        for (const ps of pageSets) {
            const overlap = wordOverlap(chunkWords, ps.words);
            // Use a lower threshold for OCR pages — they tend to have
            // short, structured text with less word overlap.
            const threshold = ps.isOcrPage ? 0.08 : 0.15;
            if (overlap > threshold) {
                contributors.push({
                    pageNumber: ps.pageNumber,
                    method: ps.method,
                    confidence: ps.confidence,
                    overlap,
                });
            }
        }

        contributors.sort((a, b) => b.overlap - a.overlap);

        // ── Figure detection ────────────────────────────────────────────
        const matchedFigureIds = new Set();

        // Method 1: Pattern match for figure IDs embedded in chunk text
        const idMatches = chunk.content.matchAll(figureIdPattern);
        for (const match of idMatches) {
            matchedFigureIds.add(match[1]);
        }

        // Method 2: Word overlap with figure snippets (catches partial
        // matches when the [Figure ...] marker was split across chunks)
        for (const fs of figureSets) {
            if (matchedFigureIds.has(fs.figureId)) continue;
            const overlap = wordOverlap(fs.words, chunkWords);
            if (overlap > 0.3) {
                matchedFigureIds.add(fs.figureId);
            }
        }

        const figureIds = [...matchedFigureIds];
        const hasFigureContent = figureIds.length > 0;

        // ── Table detection ─────────────────────────────────────────────
        const matchedTableIds = new Set();

        // Method 1: Pattern match for table IDs embedded in chunk text
        const tableIdMatches = chunk.content.matchAll(tableIdPattern);
        for (const match of tableIdMatches) {
            matchedTableIds.add(match[1]);
        }

        // Method 2: Word overlap with table snippets (catches partial
        // matches when the [Table ...] marker was split across chunks)
        for (const ts of tableSets) {
            if (matchedTableIds.has(ts.tableId)) continue;
            const overlap = wordOverlap(ts.words, chunkWords);
            if (overlap > 0.3) {
                matchedTableIds.add(ts.tableId);
            }
        }

        const tableIds = [...matchedTableIds];
        const hasTableContent = tableIds.length > 0;

        // ── Derive extraction method ────────────────────────────────────
        const methods = new Set(contributors.map((c) => c.method));
        if (hasFigureContent) methods.add("figure");
        if (hasTableContent) methods.add("table");

        let extractionMethod = "text";
        if (methods.size > 1) {
            extractionMethod = "mixed";
        } else if (methods.has("ocr")) {
            extractionMethod = "ocr";
        } else if (methods.has("figure")) {
            extractionMethod = "figure";
        } else if (methods.has("table")) {
            extractionMethod = "table";
        }

        // ── OCR confidence (Phase 1 logic — unchanged) ──────────────────
        const ocrHits = contributors.filter(
            (c) => c.method === "ocr" && c.confidence != null
        );
        const avgConfidence =
            ocrHits.length > 0
                ? Math.round(
                      (ocrHits.reduce((s, c) => s + c.confidence, 0) /
                          ocrHits.length) *
                          10
                  ) / 10
                : null;

        chunk.metadata = {
            ...chunk.metadata,
            extractionMethod,
            ocrConfidence: avgConfidence,
            sourcePages: contributors.map((c) => c.pageNumber),
            figureIds,
            hasFigureContent,
            tableIds,
            hasTableContent,
        };
    }

    return chunks;
};
