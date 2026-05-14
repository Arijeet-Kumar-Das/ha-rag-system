import { retrieveRelevantChunks } from "../services/retrievalService.js";
import { streamAnswer } from "../services/llmService.js";
import { verifyAnswer } from "../services/verificationService.js";
import { getCache, setCache } from "../services/cacheService.js";
import { classifyQuery } from "../services/classificationService.js";
import { createSseStream } from "../utils/sse.js";
import Document from "../models/Document.js";
import Workspace from "../models/Workspace.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const normalizeIds = (ids = []) => {
    return [...new Set(ids.filter(Boolean).map(id => id.toString()))];
};

const toDocumentTarget = (doc) => ({
    documentId: doc._id.toString(),
    namespace: doc.namespace,
    fileName: doc.fileName
});

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

const resolveQuestionScope = async ({ userId, workspaceId, documentId, documentIds, existingChat }) => {
    const requestedWorkspaceId = workspaceId || existingChat?.workspaceId || null;
    const requestedDocumentId = documentId || existingChat?.documentId || null;

    if (requestedWorkspaceId) {
        const workspace = await Workspace.findOne({ _id: requestedWorkspaceId, userId });
        if (!workspace) {
            throw createHttpError(404, "Workspace not found");
        }

        const workspaceDocumentIds = normalizeIds(workspace.documentIds);
        const requestedDocumentIds = normalizeIds(
            documentIds?.length
                ? documentIds
                : existingChat?.activeDocumentIds?.length
                    ? existingChat.activeDocumentIds
                    : workspaceDocumentIds
        );
        const requestedSet = new Set(requestedDocumentIds);

        const workspaceDocs = workspaceDocumentIds.length
            ? await Document.find({ _id: { $in: workspaceDocumentIds }, userId }).sort({ uploadDate: -1 })
            : [];
        let targetDocs = workspaceDocs.filter(doc => requestedSet.has(doc._id.toString()));

        if (targetDocs.length === 0 && workspaceDocs.length > 0) {
            targetDocs = workspaceDocs;
        }

        return {
            workspace,
            workspaceId: workspace._id.toString(),
            targetDocumentId: null,
            targetDocs,
            cacheScope: `workspace:${workspace._id}:${targetDocs.map(doc => doc._id.toString()).sort().join(",")}`
        };
    }

    if (requestedDocumentId) {
        const doc = await Document.findById(requestedDocumentId);
        if (!doc) {
            throw createHttpError(404, "Selected document not found");
        }

        if (doc.userId !== userId) {
            throw createHttpError(403, "Not authorized to access this document");
        }

        return {
            workspace: null,
            workspaceId: null,
            targetDocumentId: doc._id.toString(),
            targetDocs: [doc],
            cacheScope: `document:${doc._id}`
        };
    }

    const latestDoc = await Document.findOne({ userId }).sort({ uploadDate: -1 });
    if (!latestDoc) {
        return {
            workspace: null,
            workspaceId: null,
            targetDocumentId: null,
            targetDocs: [],
            cacheScope: "document:none"
        };
    }

    console.log(`[ASK] No documentId provided, defaulting to latest: ${latestDoc.namespace}`);
    return {
        workspace: null,
        workspaceId: null,
        targetDocumentId: latestDoc._id.toString(),
        targetDocs: [latestDoc],
        cacheScope: `document:${latestDoc._id}`
    };
};

export const askQuestion = async (req, res) => {
    let stream = null;
    const abortController = new AbortController();

    try {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const userId = req.user._id.toString();
        const {
            question,
            documentId,
            documentIds = [],
            workspaceId,
            chatId,
            mode = "standard"
        } = req.body;
        console.log("[ASK] Mode:", mode);

        if (!question) {
            return res.status(400).json({ error: "Question is required" });
        }

        console.log("question:", question);
        console.log("documentId:", documentId);
        console.log("workspaceId:", workspaceId);

        let targetChatId = chatId;
        let chatHistory = [];
        let existingChat = null;

        if (targetChatId) {
            existingChat = await Chat.findById(targetChatId);
            if (!existingChat) return res.status(404).json({ error: "Chat not found" });

            if (existingChat.userId !== userId) {
                return res.status(403).json({ error: "Not authorized to access this chat" });
            }

            chatHistory = await Message.find({ chatId: targetChatId }).sort({ createdAt: 1 });
            console.log("chatHistory length:", chatHistory.length);
        }

        const scope = await resolveQuestionScope({
            userId,
            workspaceId,
            documentId,
            documentIds,
            existingChat
        });
        const retrievalTargets = scope.targetDocs.map(toDocumentTarget);
        const activeDocumentIds = scope.targetDocs.map(doc => doc._id.toString());
        console.log("Resolved targets:", retrievalTargets.map(target => target.fileName));

        if (!targetChatId) {
            const title = question.substring(0, 40) + (question.length > 40 ? "..." : "");
            const newChat = await Chat.create({
                title: title || "New Chat",
                documentId: scope.targetDocumentId,
                workspaceId: scope.workspaceId,
                activeDocumentIds,
                userId
            });
            targetChatId = newChat._id;
        } else {
            await Chat.findByIdAndUpdate(targetChatId, {
                documentId: scope.targetDocumentId,
                workspaceId: scope.workspaceId,
                activeDocumentIds,
                updatedAt: new Date()
            });
        }

        await Message.create({
            chatId: targetChatId,
            role: "user",
            content: question
        });

        res.setHeader("X-Chat-Id", targetChatId.toString());
        stream = createSseStream(req, res);
        stream.send("meta", {
            chatId: targetChatId.toString(),
            workspaceId: scope.workspaceId,
            documentIds: activeDocumentIds
        });

        req.on("close", () => abortController.abort());

        if (retrievalTargets.length === 0) {
            await streamStaticAnswer(stream, targetChatId, "No active documents found in this workspace.", []);
            return;
        }

        const cached = getCache(question, scope.cacheScope);
        if (cached) {
            console.log("CACHE HIT:", question, "for scope:", scope.cacheScope);
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
        const chunks = await retrieveRelevantChunks(question, retrievalTargets);
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
            chunkIndex: c.chunkIndex,
            documentId: c.documentId,
            namespace: c.namespace
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
            setCache(question, { answer: fullAnswer, sources, verification }, scope.cacheScope);
        }

        console.log(`Total RAG request time: ${Date.now() - startTime}ms`);
    } catch (error) {
        console.error("ASK ERROR:", error);

        if (stream && !stream.isClosed()) {
            streamError(stream, error.status ? error.message : "Streaming failed");
            return;
        }

        if (!res.headersSent) {
            return res.status(error.status || 500).json({ error: error.status ? error.message : "Streaming failed" });
        }

        if (!res.writableEnded) {
            res.end();
        }
    }
};
