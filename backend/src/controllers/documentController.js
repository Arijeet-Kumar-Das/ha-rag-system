import { getIndex } from "../services/vectorService.js";
import Document from "../models/Document.js";
import Chunk from "../models/Chunk.js";

export const getDocuments = async (req, res) => {
    try {
        const docs = await Document.find({ userId: "anonymous" })
            .select("_id fileName namespace uploadDate chunkCount")
            .sort({ uploadDate: -1 });
        res.json(docs);
    } catch (error) {
        console.error("[GET DOCS ERROR]", error);
        res.status(500).json({ error: "Failed to fetch documents" });
    }
};

export const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params; // This is the namespace

        if (!id) {
            return res.status(400).json({ error: "Document ID is required" });
        }

        const doc = await Document.findOne({ namespace: id });
        if (!doc) {
            return res.status(404).json({ error: "Document not found" });
        }

        // 1. Delete from Pinecone
        const index = getIndex();
        try {
            await index.namespace(id).deleteAll();
            console.log(`[DELETE] Pinecone namespace ${id} deleted.`);
        } catch (pineconeErr) {
            console.error("[DELETE] Failed to delete Pinecone namespace (might not exist):", pineconeErr.message);
        }

        // 2. Delete from MongoDB
        await Chunk.deleteMany({ namespace: id });
        await Document.deleteOne({ namespace: id });

        console.log(`[DELETE] MongoDB records for ${id} deleted.`);

        return res.json({ message: "Document deleted successfully", documentId: id });

    } catch (error) {
        console.error("[DELETE ERROR]", error);
        return res.status(500).json({ error: "Failed to delete document" });
    }
};
