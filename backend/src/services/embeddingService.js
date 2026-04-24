import OpenAI from "openai";

let openai;
const getClient = () => {
    if (!openai) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
};

export const generateEmbedding = async (text) => {
    const response = await getClient().embeddings.create({
        model: "text-embedding-3-small",
        input: text
    });

    return response.data[0].embedding;
};