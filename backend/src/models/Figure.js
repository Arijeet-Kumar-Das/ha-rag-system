import mongoose from "mongoose";

const figureSchema = new mongoose.Schema({
    figureId: { type: String, required: true, unique: true },
    namespace: String,
    userId: String,
    fileName: String,
    pageNumber: Number,
    type: String,
    description: String,
    caption: String,
    labels: [String],
    visionModel: String,
    createdAt: { type: Date, default: Date.now },
});

figureSchema.index({ namespace: 1 });
figureSchema.index({ userId: 1, namespace: 1 });
figureSchema.index({ pageNumber: 1 });

export default mongoose.model("Figure", figureSchema);
