import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    userId: { type: String, required: true },
    documentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
}, { timestamps: true });

workspaceSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model("Workspace", workspaceSchema);
