import { Canvas, Image, createCanvas, CanvasRenderingContext2D } from "canvas";
globalThis.Canvas = Canvas;
globalThis.Image = Image;

// Override drawImage to log diagnostics
const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage = function (img, ...args) {
    if (img && typeof img === "object") {
        console.log(`[DRAW-IMAGE-DIAG] drawImage called with:`, {
            constructorName: img.constructor?.name,
            type: typeof img,
            isBuffer: Buffer.isBuffer(img),
            width: img.width,
            height: img.height,
            keys: Object.keys(img)
        });
    } else {
        console.log(`[DRAW-IMAGE-DIAG] drawImage called with non-object:`, img);
    }
    try {
        return originalDrawImage.call(this, img, ...args);
    } catch (err) {
        console.error(`[DRAW-IMAGE-DIAG] ❌ drawImage threw:`, err.message);
        throw err;
    }
};

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import { renderPageToImage } from "./src/utils/pdfParser.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

async function test() {
    const pdfPath = path.resolve("../docs/HA-RAG RESEARCH PAPER.pdf");
    console.log(`Loading PDF from: ${pdfPath}`);
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    const data = new Uint8Array(pdfBuffer);
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    console.log(`PDF loaded. Total pages: ${pdf.numPages}`);
    
    // Render only Page 7
    console.log(`\n--- Page 7 ---`);
    try {
        const page = await pdf.getPage(7);
        console.log(`Rendering page 7 to image...`);
        const imgBuffer = await renderPageToImage(page);
        console.log(`Image rendered. Size: ${imgBuffer.length} bytes`);
    } catch (err) {
        console.error(`❌ Page 7 failed:`, err);
    }
}

test().catch(console.error);
