import mongoose from "mongoose";

const tableSchema = new mongoose.Schema({
    tableId: { type: String, required: true, unique: true },
    namespace: String,
    userId: String,
    fileName: String,
    pageNumber: Number,
    type: String, // 'comparison', 'data', 'results', 'summary', etc.
    description: String,
    insights: String,
    headers: [String],
    rowCount: Number,
    caption: String,
    visionModel: String,
    createdAt: { type: Date, default: Date.now },
});

tableSchema.index({ namespace: 1 });
tableSchema.index({ userId: 1, namespace: 1 });

export default mongoose.model("Table", tableSchema);
