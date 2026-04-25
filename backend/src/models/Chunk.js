import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema({
    text: String,
    chunkIndex: Number,
    fileName: String,
    namespace: String
});


chunkSchema.index({ text: "text" });

export default mongoose.model("Chunk", chunkSchema);