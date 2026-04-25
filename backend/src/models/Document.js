import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    fileName: String,
    namespace: String,
    userId: { type: String, default: "anonymous" },
    chunkCount: Number,
    uploadDate: { type: Date, default: Date.now }
});

export default mongoose.model("Document", documentSchema);
