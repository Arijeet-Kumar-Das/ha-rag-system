/**
 * Table Text Merger
 *
 * Merges table-description text snippets into the page text stream,
 * producing an enriched fullText that flows into chunkText() unchanged.
 *
 * When no tables are present this is a zero-cost passthrough.
 *
 * Public API:
 *   mergeTableDescriptions(fullText, pages, tables)
 *     → { enrichedText: string, enrichedPages: Page[] }
 */

/**
 * Merge table description snippets into page text for downstream chunking.
 *
 * @param {string} fullText   Concatenated page text (possibly already enriched with figures).
 * @param {Array}  pages      Per-page data (possibly already enriched with figure metadata).
 * @param {Array}  tables     Table data from extractTables().
 * @returns {{ enrichedText: string, enrichedPages: Array }}
 */
export const mergeTableDescriptions = (fullText, pages, tables) => {
    if (!tables || tables.length === 0) {
        // No-op passthrough — pages get default table metadata
        const enrichedPages = pages.map((p) => ({
            ...p,
            hasTables: false,
            tableIds: [],
        }));
        return { enrichedText: fullText, enrichedPages };
    }

    // ── Group tables by page number ──────────────────────────────────────
    const tablesByPage = new Map();
    for (const tbl of tables) {
        if (!tablesByPage.has(tbl.pageNumber)) {
            tablesByPage.set(tbl.pageNumber, []);
        }
        tablesByPage.get(tbl.pageNumber).push(tbl);
    }

    // ── Enrich each page's text with its table descriptions ─────────────
    const enrichedPages = pages.map((page) => {
        const pageTables = tablesByPage.get(page.pageNumber);
        if (!pageTables || pageTables.length === 0) {
            return { ...page, hasTables: false, tableIds: [] };
        }

        const tableText = pageTables
            .map((t) => t.textSnippet)
            .join("\n\n");

        const enrichedPageText = `${page.text}\n\n${tableText}`;

        return {
            ...page,
            text: enrichedPageText,
            charCount: enrichedPageText.length,
            hasTables: true,
            tableIds: pageTables.map((t) => t.tableId),
        };
    });

    const enrichedText = enrichedPages.map((p) => p.text).join("\n");

    console.log(
        `[TABLE-MERGER] Injected ${tables.length} table description(s) across ${tablesByPage.size} page(s)`
    );

    return { enrichedText, enrichedPages };
};
