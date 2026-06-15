import { createCanvas } from "canvas";
import { createWorker } from "tesseract.js";

async function test() {
    console.log("Creating canvas...");
    const canvas = createCanvas(200, 200);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText("Hello World", 50, 100);

    const buffer = canvas.toBuffer("image/png");
    console.log("Buffer constructor name:", buffer?.constructor?.name);
    console.log("Buffer.isBuffer:", Buffer.isBuffer(buffer));
    console.log("Buffer length:", buffer?.length);

    console.log("Initializing Tesseract worker...");
    const worker = await createWorker("eng");
    
    try {
        console.log("Running worker.recognize on Buffer...");
        const result = await worker.recognize(buffer);
        console.log("OCR Success:", result.data.text.trim());
    } catch (err) {
        console.error("OCR Failed:", err);
    } finally {
        await worker.terminate();
    }
}

test().catch(console.error);
