import OpenAI from "openai";

let client;
const getClient = () => {
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
};

export const verifyAnswer = async (question, answer, chunks) => {
    const context = chunks.map(c => c.text).join("\n\n");

    const prompt = `
You are verifying if an answer is supported by given context.

Context:
${context}

Question:
${question}

Answer:
${answer}

Rules:
- Reply ONLY with "YES" or "NO"
- YES = answer is supported by context
- NO = answer is not supported or hallucinated
`;

    const response = await getClient().chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
            { role: "system", content: "You are a strict verifier." },
            { role: "user", content: prompt }
        ]
    });

    const result = response.choices[0].message.content.trim();

    return result === "YES";
};