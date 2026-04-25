import Chunk from "../models/Chunk.js";

export const keywordSearch = async (query, namespace) => {
    const filter = { $text: { $search: query } };
    if (namespace) {
        filter.namespace = namespace;
    }

    const results = await Chunk.find(
        filter,
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