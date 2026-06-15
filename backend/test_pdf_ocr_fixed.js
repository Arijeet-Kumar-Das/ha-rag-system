import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { recognizeImage } from "./src/services/ocrService.js";

// Custom canvas factory using Automattic/node-canvas
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

async function test() {
    const pdfPath = path.resolve("../docs/HA-RAG RESEARCH PAPER.pdf");
    console.log(`Loading PDF from: ${pdfPath}`);
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    const data = new Uint8Array(pdfBuffer);
    
    // Pass canvasFactory to getDocument!
    const pdf = await pdfjsLib.getDocument({ 
        data,
        canvasFactory: canvasFactory
    }).promise;
    
    console.log(`PDF loaded. Total pages: ${pdf.numPages}`);
    
    // Render and OCR Page 7
    console.log(`\n--- Page 7 ---`);
    try {
        const page = await pdf.getPage(7);
        console.log(`Rendering page 7 to image...`);
        
        const scale = 2.0;
        const viewport = page.getViewport({ scale });
        const width = Math.floor(viewport.width);
        const height = Math.floor(viewport.height);

        const canvas = createCanvas(width, height);
        const context = canvas.getContext("2d");

        await page.render({ canvasContext: context, viewport }).promise;
        const imgBuffer = canvas.toBuffer("image/png");
        console.log(`Image rendered successfully. Size: ${imgBuffer.length} bytes`);
        
        console.log(`Running recognizeImage...`);
        const ocrResult = await recognizeImage(imgBuffer);
        console.log(`OCR Success! Text length:`, ocrResult.text.length);
    } catch (err) {
        console.error(`❌ Page 7 failed:`, err);
    }
}

test().catch(console.error);
