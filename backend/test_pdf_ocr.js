import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import { renderPageToImage } from "./src/utils/pdfParser.js";
import { recognizeImage } from "./src/services/ocrService.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

async function test() {
    const pdfPath = path.resolve("../docs/HA-RAG RESEARCH PAPER.pdf");
    console.log(`Loading PDF from: ${pdfPath}`);
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    const data = new Uint8Array(pdfBuffer);
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    console.log(`PDF loaded. Total pages: ${pdf.numPages}`);
    
    for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`\n--- Page ${i} ---`);
        try {
            const page = await pdf.getPage(i);
            console.log(`Rendering page ${i} to image...`);
            const imgBuffer = await renderPageToImage(page);
            console.log(`Image rendered. Size: ${imgBuffer.length} bytes`);
            
            console.log(`Running recognizeImage...`);
            const ocrResult = await recognizeImage(imgBuffer);
            console.log(`OCR Success! Text length:`, ocrResult.text.length);
        } catch (err) {
            console.error(`❌ Page ${i} failed:`, err);
        }
    }
}

test().catch(console.error);
