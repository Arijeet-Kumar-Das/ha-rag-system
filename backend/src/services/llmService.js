import OpenAI from "openai";

let client;
const getClient = () => {
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
};

const buildMessages = (question, chunks) => {
    if (!chunks || chunks.length === 0) {
        return null;
    }

    // 1. Group chunks by fileName to keep related context together
    const grouped = chunks.reduce((acc, chunk) => {
        const file = chunk.fileName || "unknown";
        if (!acc[file]) acc[file] = [];
        acc[file].push(chunk);
        return acc;
    }, {});

    // 2. Sort within each group by chunkIndex to maintain logical flow
    const sortedContexts = [];
    for (const file in grouped) {
        grouped[file].sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));
        grouped[file].forEach(chunk => {
            if (chunk.text) {
                sortedContexts.push(chunk.text);
            }
        });
    }

    // 3. Limit total context size to ~1500 words
    let joinedContext = "";
    let currentWordCount = 0;
    const MAX_WORDS = 1500;

    for (const text of sortedContexts) {
        const words = text.split(/\s+/);
        if (currentWordCount + words.length > MAX_WORDS) {
            const remaining = MAX_WORDS - currentWordCount;
            if (remaining > 0) {
                joinedContext += (joinedContext ? "\n-----\n" : "") + words.slice(0, remaining).join(" ");
            }
            break; // Stop adding more context to prevent overflow
        }
        joinedContext += (joinedContext ? "\n-----\n" : "") + text;
        currentWordCount += words.length;
    }

    return [
        {
            role: "system",
            content: "You are an academic assistant. Use ALL relevant context to answer.\nIf the answer contains multiple points, list ALL of them completely.\nDo NOT omit important parts.\nDo NOT hallucinate beyond context."
        },
        {
            role: "user",
            content: `Context:\n${joinedContext}\n\nQuestion:\n${question}`
        }
    ];
};

export const generateAnswer = async (question, chunks) => {
    console.log(`[LLM] Retrieved chunks count: ${chunks?.length || 0}`);
    
    const messages = buildMessages(question, chunks);
    if (!messages) {
        return "Not enough information found in documents.";
    }

    const contextLength = messages[1].content.split(/\s+/).length;
    console.log(`[LLM] Final selected chunks for context: ${chunks.length}`);
    console.log(`[LLM] Context length (words): ${contextLength}`);

    console.time("LLM Response Time");
    const response = await getClient().chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages
    });
    console.timeEnd("LLM Response Time");

    return response.choices[0].message.content.trim();
};

export const streamAnswer = async (question, chunks, res) => {
    console.log(`[LLM Stream] Retrieved chunks count: ${chunks?.length || 0}`);
    
    const messages = buildMessages(question, chunks);
    if (!messages) {
        res.write("Not enough information found in documents.");
        res.end();
        return;
    }

    const contextLength = messages[1].content.split(/\s+/).length;
    console.log(`[LLM Stream] Final selected chunks for context: ${chunks.length}`);
    console.log(`[LLM Stream] Context length (words): ${contextLength}`);

    console.time("LLM Stream Time");
    const stream = await getClient().chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        stream: true,
        messages
    });

    for await (const chunk of stream) {
        const token = chunk.choices?.[0]?.delta?.content;
        if (token) {
            res.write(token);
        }
    }
    console.timeEnd("LLM Stream Time");

    res.end();
};