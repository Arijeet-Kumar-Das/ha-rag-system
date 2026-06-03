import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    title: { type: String, required: true, maxlength: 80 },
    documentId: { type: String, default: null },
    workspaceId: { type: String, default: null },
    activeDocumentIds: [{ type: String }],
    userId: { type: String, required: true },
}, { timestamps: true });

chatSchema.index({ userId: 1, workspaceId: 1, updatedAt: -1 });
chatSchema.index({ userId: 1, documentId: 1, updatedAt: -1 });

export default mongoose.model("Chat", chatSchema);
