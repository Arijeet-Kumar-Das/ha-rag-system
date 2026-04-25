import OpenAI from "openai";

let client;
const getClient = () => {
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
};

const buildMessages = (question, chunks, chatHistory = []) => {
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

    // 4. Prepend chatHistory (limit to last 6 messages, trim each to prevent overflow)
    const MAX_HISTORY_WORDS = 1500;
    const MAX_PER_MESSAGE_WORDS = 500;
    let historyWordCount = 0;

    const trimmedHistory = chatHistory.slice(-6);
    const historyMessages = [];

    for (const msg of trimmedHistory) {
        const words = (msg.content || "").split(/\s+/);
        const trimmedWords = words.slice(0, MAX_PER_MESSAGE_WORDS);
        const trimmedContent = trimmedWords.join(" ") + (words.length > MAX_PER_MESSAGE_WORDS ? "..." : "");

        if (historyWordCount + trimmedWords.length > MAX_HISTORY_WORDS) {
            break; // Stop adding more history to prevent context overflow
        }

        historyMessages.push({
            role: msg.role,
            content: trimmedContent
        });
        historyWordCount += trimmedWords.length;
    }

    console.log(`[LLM] Chat history: ${historyMessages.length} messages, ~${historyWordCount} words`);

    return [
        {
            role: "system",
            content: "You are an academic assistant. Use ALL relevant context to answer.\nIf the answer contains multiple points, list ALL of them completely.\nDo NOT omit important parts.\nDo NOT hallucinate beyond context."
        },
        ...historyMessages,
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

    // The user content message is always the last element
    const userMessage = messages[messages.length - 1];
    const contextLength = userMessage.content.split(/\s+/).length;
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

export const streamAnswer = async (question, chunks, chatHistory, res) => {
    // HARD VALIDATION: res must be a writable response object
    if (!res || typeof res.write !== "function") {
        throw new Error("Invalid res object passed to streamAnswer");
    }

    console.log(`[LLM Stream] Retrieved chunks count: ${chunks?.length || 0}`);
    
    const messages = buildMessages(question, chunks, chatHistory);
    if (!messages) {
        return "Not enough information found in documents.";
    }

    // The user content message is always the last element
    const userMessage = messages[messages.length - 1];
    const contextLength = userMessage.content.split(/\s+/).length;
    console.log(`[LLM Stream] Final selected chunks for context: ${chunks.length}`);
    console.log(`[LLM Stream] Context length (words): ${contextLength}`);

    let fullAnswer = "";
    try {
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
                fullAnswer += token;
            }
        }
        console.timeEnd("LLM Stream Time");
    } catch (err) {
        console.error("STREAM ERROR:", err);
        if (!res.writableEnded) {
            res.write("Error generating response.");
        }
        fullAnswer = fullAnswer || "Error generating response.";
    }
    // NOTE: res.end() is NOT called here — the controller manages stream lifecycle
    return fullAnswer;
};