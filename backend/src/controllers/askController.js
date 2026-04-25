import { retrieveRelevantChunks } from "../services/retrievalService.js";
import { generateAnswer, streamAnswer } from "../services/llmService.js";
import { verifyAnswer } from "../services/verificationService.js";
import { getCache, setCache } from "../services/cacheService.js";
import { classifyQuery } from "../services/classificationService.js";
import Document from "../models/Document.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

export const askQuestion = async (req, res) => {
    try {
        const { question, documentId, chatId, mode = "standard" } = req.body;
        console.log("[ASK] Mode:", mode);

        if (!question) {
            return res.status(400).json({ error: "Question is required" });
        }

        console.log("question:", question);
        console.log("documentId:", documentId);

        // Determine which namespace to query
        let namespace = null;
        let targetDocumentId = documentId;

        if (documentId) {
            const doc = await Document.findById(documentId);
            console.log("Found doc:", doc);
            if (!doc) {
                return res.status(404).json({ error: "Selected document not found" });
            }

            namespace = doc.namespace;
            console.log("Namespace:", namespace);

            targetDocumentId = doc._id;
        } else {
            const latestDoc = await Document.findOne().sort({ uploadDate: -1 });
            if (latestDoc) {
                targetDocumentId = latestDoc._id;
                namespace = latestDoc.namespace;
                console.log(`[ASK] No documentId provided, defaulting to latest: ${namespace}`);
            } else {
                console.log(`[ASK] No documentId provided and no documents found in DB. Retrieval might fail.`);
            }
        }

        console.log("Resolved namespace:", namespace);

        // Handle Chat creation/lookup
        let targetChatId = chatId;
        let chatHistory = [];

        if (targetChatId) {
            const chat = await Chat.findById(targetChatId);
            if (!chat) return res.status(404).json({ error: "Chat not found" });
            // Load history BEFORE saving the current user message to avoid duplicates
            chatHistory = await Message.find({ chatId: targetChatId }).sort({ createdAt: 1 });
            console.log("chatHistory length:", chatHistory.length);
        } else {
            const title = question.substring(0, 40) + (question.length > 40 ? "..." : "");
            const newChat = await Chat.create({ title: title || "New Chat", documentId: targetDocumentId });
            targetChatId = newChat._id;
        }

        // Save User Message AFTER loading history so it doesn't appear in chatHistory
        await Message.create({
            chatId: targetChatId,
            role: "user",
            content: question
        });

        res.setHeader("X-Chat-Id", targetChatId.toString());

        // 0. Check cache first
        const cached = getCache(question, namespace);
        if (cached) {
            console.log("CACHE HIT:", question, "for namespace:", namespace);
            
            // Save Assistant Message from cache
            await Message.create({
                chatId: targetChatId,
                role: "assistant",
                content: cached.answer,
                sources: cached.sources
            });
            await Chat.findByIdAndUpdate(targetChatId, { updatedAt: new Date() });

            return res.json(cached);
        }

        // 1. Classify query
        const queryType = await classifyQuery(question);
        console.log("QUERY TYPE:", queryType);

        if (queryType === "DB") {
            const dbAnswer = "This will be fetched from database";
            await Message.create({ chatId: targetChatId, role: "assistant", content: dbAnswer });
            await Chat.findByIdAndUpdate(targetChatId, { updatedAt: new Date() });
            
            return res.json({
                answer: dbAnswer,
                sources: []
            });
        }

        const startTime = Date.now();

        console.time("Retrieval");
        // 2. Retrieve chunks (RAG path)
        const chunks = await retrieveRelevantChunks(question, namespace);
        console.timeEnd("Retrieval");
        console.log("chunks length:", chunks?.length);

        if (!chunks || chunks.length === 0) {
            const emptyAnswer = "No relevant information found";
            await Message.create({ chatId: targetChatId, role: "assistant", content: emptyAnswer });
            await Chat.findByIdAndUpdate(targetChatId, { updatedAt: new Date() });

            return res.json({
                answer: emptyAnswer,
                sources: []
            });
        }

        const context = chunks
            .map(c => c.text)
            .filter(Boolean)
            .join("\n---\n");
        console.log("Context length:", context.length);
        console.log("Chunks used:", chunks.length);

        if (!context || context.trim().length === 0) {
            const contextAnswer = "No usable context found.";
            await Message.create({ chatId: targetChatId, role: "assistant", content: contextAnswer });
            await Chat.findByIdAndUpdate(targetChatId, { updatedAt: new Date() });

            return res.json({
                answer: contextAnswer,
                sources: []
            });
        }

        // Build sources before streaming
        const sources = chunks.map(c => ({
            text: c.text,
            fileName: c.fileName,
            chunkIndex: c.chunkIndex
        }));

        // Only put lightweight metadata in header (no chunk text) to avoid Header overflow
        const sourceMeta = sources.map(s => ({
            fileName: s.fileName,
            chunkIndex: s.chunkIndex
        }));

        // Set streaming headers BEFORE calling streamAnswer
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Transfer-Encoding", "chunked");
        res.setHeader("X-Sources", encodeURIComponent(JSON.stringify(sourceMeta)));
        res.flushHeaders();

        let fullAnswer = "";
        let verification = null;
        try {
            console.log("Streaming started");
            console.time("LLM Streaming");
            fullAnswer = await streamAnswer(question, chunks, chatHistory || [], res);
            console.timeEnd("LLM Streaming");
            console.log("Streaming finished");

            // Run verification if mode is "verified"
            if (mode === "verified" && fullAnswer && fullAnswer !== "Error generating response") {
                console.time("Verification");
                verification = await verifyAnswer(question, fullAnswer, chunks);
                console.timeEnd("Verification");
                console.log("Verification:", verification.confidence);
            }

            // Append sources + verification as a delimiter at the end of the stream body
            // Frontend will split on __SOURCES__ to extract them
            if (!res.writableEnded) {
                const payload = { sources, verification };
                res.write(`\n\n__SOURCES__${JSON.stringify(payload)}`);
            }
        } catch (err) {
            console.error("ASK CONTROLLER ERROR:", err);

            if (!res.headersSent) {
                return res.status(500).json({ error: "Streaming failed" });
            }
            fullAnswer = "Error generating response";
        } finally {
            // Always end the response
            if (!res.writableEnded) {
                res.end();
            }
        }
        
        // Save Assistant Message
        if (fullAnswer) {
            await Message.create({
                chatId: targetChatId,
                role: "assistant",
                content: fullAnswer,
                sources: sources
            });
            await Chat.findByIdAndUpdate(targetChatId, { updatedAt: new Date() });
        }

        // Cache the answer
        if (fullAnswer && fullAnswer !== "Error generating response") {
            setCache(question, { answer: fullAnswer, sources }, namespace);
        }

        console.log(`Total RAG request time: ${Date.now() - startTime}ms`);

    } catch (error) {
        console.error("ASK ERROR:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Streaming failed" });
        } else if (!res.writableEnded) {
            res.end();
        }
    }
};