import { retrieveRelevantChunks } from "../services/retrievalService.js";
import { streamAnswer } from "../services/llmService.js";
import { verifyAnswer } from "../services/verificationService.js";
import { getCache, setCache } from "../services/cacheService.js";
import { classifyQuery } from "../services/classificationService.js";
import { createSseStream } from "../utils/sse.js";
import Document from "../models/Document.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

const persistAssistantMessage = async (chatId, content, sources = []) => {
    await Message.create({
        chatId,
        role: "assistant",
        content,
        sources
    });
    await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });
};

const streamStaticAnswer = async (stream, chatId, answer, sources = [], verification = null) => {
    stream.send("token", { text: answer });
    stream.send("sources", { sources, verification });
    stream.send("done", { answer });
    stream.close();

    await persistAssistantMessage(chatId, answer, sources);
};

const streamError = (stream, message) => {
    stream.send("error", { message });
    stream.close();
};

export const askQuestion = async (req, res) => {
    let stream = null;
    const abortController = new AbortController();

    try {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const userId = req.user._id.toString();
        const { question, documentId, chatId, mode = "standard" } = req.body;
        console.log("[ASK] Mode:", mode);

        if (!question) {
            return res.status(400).json({ error: "Question is required" });
        }

        console.log("question:", question);
        console.log("documentId:", documentId);

        let namespace = null;
        let targetDocumentId = documentId;

        if (documentId) {
            const doc = await Document.findById(documentId);
            console.log("Found doc:", doc);
            if (!doc) {
                return res.status(404).json({ error: "Selected document not found" });
            }

            if (doc.userId !== userId) {
                return res.status(403).json({ error: "Not authorized to access this document" });
            }

            namespace = doc.namespace;
            targetDocumentId = doc._id;
            console.log("Namespace:", namespace);
        } else {
            const latestDoc = await Document.findOne({ userId }).sort({ uploadDate: -1 });
            if (latestDoc) {
                targetDocumentId = latestDoc._id;
                namespace = latestDoc.namespace;
                console.log(`[ASK] No documentId provided, defaulting to latest: ${namespace}`);
            } else {
                console.log("[ASK] No documentId provided and no documents found in DB. Retrieval might fail.");
            }
        }

        console.log("Resolved namespace:", namespace);

        let targetChatId = chatId;
        let chatHistory = [];

        if (targetChatId) {
            const chat = await Chat.findById(targetChatId);
            if (!chat) return res.status(404).json({ error: "Chat not found" });

            if (chat.userId !== userId) {
                return res.status(403).json({ error: "Not authorized to access this chat" });
            }

            chatHistory = await Message.find({ chatId: targetChatId }).sort({ createdAt: 1 });
            console.log("chatHistory length:", chatHistory.length);
        } else {
            const title = question.substring(0, 40) + (question.length > 40 ? "..." : "");
            const newChat = await Chat.create({ title: title || "New Chat", documentId: targetDocumentId, userId });
            targetChatId = newChat._id;
        }

        await Message.create({
            chatId: targetChatId,
            role: "user",
            content: question
        });

        res.setHeader("X-Chat-Id", targetChatId.toString());
        stream = createSseStream(req, res);
        stream.send("meta", { chatId: targetChatId.toString() });

        req.on("close", () => abortController.abort());

        const cached = getCache(question, namespace);
        if (cached) {
            console.log("CACHE HIT:", question, "for namespace:", namespace);
            await streamStaticAnswer(
                stream,
                targetChatId,
                cached.answer,
                cached.sources || [],
                cached.verification || null
            );
            return;
        }

        stream.send("status", { stage: "classifying" });
        const queryType = await classifyQuery(question);
        console.log("QUERY TYPE:", queryType);

        if (queryType === "DB") {
            await streamStaticAnswer(stream, targetChatId, "This will be fetched from database", []);
            return;
        }

        const startTime = Date.now();

        stream.send("status", { stage: "retrieving" });
        console.time("Retrieval");
        const chunks = await retrieveRelevantChunks(question, namespace);
        console.timeEnd("Retrieval");
        console.log("chunks length:", chunks?.length);

        if (!chunks || chunks.length === 0) {
            await streamStaticAnswer(stream, targetChatId, "No relevant information found", []);
            return;
        }

        const context = chunks
            .map(c => c.text)
            .filter(Boolean)
            .join("\n---\n");
        console.log("Context length:", context.length);
        console.log("Chunks used:", chunks.length);

        if (!context || context.trim().length === 0) {
            await streamStaticAnswer(stream, targetChatId, "No usable context found.", []);
            return;
        }

        const sources = chunks.map(c => ({
            text: c.text,
            fileName: c.fileName,
            chunkIndex: c.chunkIndex
        }));

        let fullAnswer = "";
        let verification = null;

        try {
            console.log("Streaming started");
            fullAnswer = await streamAnswer(
                question,
                chunks,
                chatHistory,
                (token) => stream.send("token", { text: token }),
                { signal: abortController.signal }
            );
            console.log("Streaming finished");
        } catch (err) {
            if (abortController.signal.aborted || stream.isClosed()) {
                console.log("[ASK] Client disconnected during streaming");
                return;
            }

            throw err;
        }

        if (abortController.signal.aborted || stream.isClosed()) {
            console.log("[ASK] Client disconnected before stream completion");
            return;
        }

        if (!fullAnswer) {
            fullAnswer = "I couldn't generate a response.";
            stream.send("token", { text: fullAnswer });
        }

        if (mode === "verified" && fullAnswer) {
            stream.send("status", { stage: "verifying" });
            console.time("Verification");
            verification = await verifyAnswer(question, fullAnswer, chunks);
            console.timeEnd("Verification");
            console.log("Verification:", verification.confidence);
        }

        stream.send("sources", { sources, verification });
        stream.send("done", { answer: fullAnswer });
        stream.close();

        if (fullAnswer) {
            await persistAssistantMessage(targetChatId, fullAnswer, sources);
            setCache(question, { answer: fullAnswer, sources, verification }, namespace);
        }

        console.log(`Total RAG request time: ${Date.now() - startTime}ms`);
    } catch (error) {
        console.error("ASK ERROR:", error);

        if (stream && !stream.isClosed()) {
            streamError(stream, "Streaming failed");
            return;
        }

        if (!res.headersSent) {
            return res.status(500).json({ error: "Streaming failed" });
        }

        if (!res.writableEnded) {
            res.end();
        }
    }
};
