import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    fileName: String,
    namespace: String,
    userId: { type: String, default: "anonymous" },
    chunkCount: Number,
    cloudinaryUrl: String,
    uploadDate: { type: Date, default: Date.now },
    extractionMethod: {
        type: String,
        enum: ["text", "ocr", "figure", "table", "mixed"],
        default: "text",
    },
    ocrStats: {
        totalPages: Number,
        textPages: Number,
        ocrPages: Number,
        failedPages: Number,
    },
    figureStats: {
        pagesWithFigures: Number,
        totalFigures: Number,
        figureTypes: [String],
    },
    tableStats: {
        pagesWithTables: Number,
        totalTables: Number,
        tableTypes: [String],
        totalRows: Number,
    },
});

documentSchema.index({ userId: 1, uploadDate: -1 });
documentSchema.index({ userId: 1, fileName: 1 });
documentSchema.index({ namespace: 1 });

export default mongoose.model("Document", documentSchema);
