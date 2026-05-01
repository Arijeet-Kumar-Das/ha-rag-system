import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Extract text from a PDF buffer (Uint8Array or Buffer).
 * No filesystem dependency — works with in-memory data from Cloudinary.
 *
 * @param {Buffer|Uint8Array} pdfBuffer - The raw PDF bytes.
 * @returns {Promise<string>} Extracted text from all pages.
 */
export const extractTextFromPDF = async (pdfBuffer) => {
    const data = new Uint8Array(pdfBuffer);
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        const strings = content.items.map((item) => item.str);
        fullText += strings.join(" ") + "\n";
    }

    return fullText;
};