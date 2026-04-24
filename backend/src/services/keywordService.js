import Chunk from "../models/Chunk.js";

export const keywordSearch = async (query) => {
    const results = await Chunk.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
    )
        .sort({ score: { $meta: "textScore" } })
        .limit(5);

    return results.map(doc => ({
        text: doc.text,
        chunkIndex: doc.chunkIndex,
        fileName: doc.fileName,
        keywordScore: doc._doc.score
    }));
};