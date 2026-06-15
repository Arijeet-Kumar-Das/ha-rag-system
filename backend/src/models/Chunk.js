import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema({
    text: String,
    chunkIndex: Number,
    fileName: String,
    namespace: String,
    userId: String,
    extractionMethod: {
        type: String,
        enum: ["text", "ocr", "figure", "table", "mixed"],
        default: "text",
    },
    ocrConfidence: { type: Number, default: null },
    sourcePages: [Number],
    figureIds: [String],
    hasFigureContent: { type: Boolean, default: false },
    tableIds: [String],
    hasTableContent: { type: Boolean, default: false },
});

chunkSchema.index({ text: "text" });
chunkSchema.index({ namespace: 1 });
chunkSchema.index({ userId: 1, namespace: 1 });

export default mongoose.model("Chunk", chunkSchema);
