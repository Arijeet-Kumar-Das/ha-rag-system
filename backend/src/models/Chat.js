import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    title: { type: String, required: true, maxlength: 40 },
    documentId: { type: String, required: true }, // Referencing the namespace UUID
}, { timestamps: true });

export default mongoose.model("Chat", chatSchema);
