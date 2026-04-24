import OpenAI from "openai";

let client;
const getClient = () => {
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
};

export const classifyQuery = async (question) => {
    const response = await getClient().chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
            {
                role: "system",
                content: `You are a query classifier for a university help system.

Classify each question into exactly one category:

"RAG" — General academic concepts, explanations, theory, or document-based questions.
"DB"  — Specific structured information like fees, deadlines, course lists, schedules, or administrative data.

Reply with ONLY "RAG" or "DB". No explanation.`
            },
            {
                role: "user",
                content: question
            }
        ]
    });

    const result = response.choices[0].message.content.trim().toUpperCase();

    return result === "DB" ? "DB" : "RAG";
};
