import Chunk from "../models/Chunk.js";

export const keywordSearch = async (query, namespace, limit = 8) => {
    const filter = { $text: { $search: query } };
    if (Array.isArray(namespace) && namespace.length > 0) {
        filter.namespace = { $in: namespace };
    } else if (namespace) {
        filter.namespace = namespace;
    }

    const results = await Chunk.find(
        filter,
        { score: { $meta: "textScore" } }
    )
        .sort({ score: { $meta: "textScore" } })
        .limit(limit);

    return results.map(doc => ({
        text: doc.text,
        chunkIndex: doc.chunkIndex,
        fileName: doc.fileName,
        namespace: doc.namespace,
        extractionMethod: doc.extractionMethod || "text",
        keywordScore: doc._doc.score
    }));
};
