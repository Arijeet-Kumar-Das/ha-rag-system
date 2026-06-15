/**
 * Figure Text Merger
 *
 * Merges figure-description text snippets into the page text stream,
 * producing an enriched fullText that flows into chunkText() unchanged.
 *
 * When no figures are present this is a zero-cost passthrough.
 *
 * Public API:
 *   mergeFigureDescriptions(fullText, pages, figures)
 *     → { enrichedText: string, enrichedPages: Page[] }
 */

/**
 * Merge figure description snippets into page text for downstream chunking.
 *
 * @param {string} fullText   Concatenated page text from extractTextFromPDF().
 * @param {Array}  pages      Per-page data from extractTextFromPDF().
 * @param {Array}  figures    Figure data from extractFigures().
 * @returns {{ enrichedText: string, enrichedPages: Array }}
 */
export const mergeFigureDescriptions = (fullText, pages, figures) => {
    if (!figures || figures.length === 0) {
        // No-op passthrough — pages get default figure metadata
        const enrichedPages = pages.map((p) => ({
            ...p,
            hasFigures: false,
            figureIds: [],
        }));
        return { enrichedText: fullText, enrichedPages };
    }

    // ── Group figures by page number ──────────────────────────────────────
    const figuresByPage = new Map();
    for (const fig of figures) {
        if (!figuresByPage.has(fig.pageNumber)) {
            figuresByPage.set(fig.pageNumber, []);
        }
        figuresByPage.get(fig.pageNumber).push(fig);
    }

    // ── Enrich each page's text with its figure descriptions ─────────────
    const enrichedPages = pages.map((page) => {
        const pageFigures = figuresByPage.get(page.pageNumber);
        if (!pageFigures || pageFigures.length === 0) {
            return { ...page, hasFigures: false, figureIds: [] };
        }

        const figureText = pageFigures
            .map((f) => f.textSnippet)
            .join("\n\n");

        const enrichedPageText = `${page.text}\n\n${figureText}`;

        return {
            ...page,
            text: enrichedPageText,
            charCount: enrichedPageText.length,
            hasFigures: true,
            figureIds: pageFigures.map((f) => f.figureId),
        };
    });

    const enrichedText = enrichedPages.map((p) => p.text).join("\n");

    console.log(
        `[FIGURE-MERGER] Injected ${figures.length} figure description(s) across ${figuresByPage.size} page(s)`
    );

    return { enrichedText, enrichedPages };
};
