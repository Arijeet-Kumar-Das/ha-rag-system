import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema({
    text: String,
    chunkIndex: Number,
    fileName: String,
    namespace: String,
    userId: String
});


chunkSchema.index({ text: "text" });
chunkSchema.index({ namespace: 1 });
chunkSchema.index({ userId: 1, namespace: 1 });

export default mongoose.model("Chunk", chunkSchema);
