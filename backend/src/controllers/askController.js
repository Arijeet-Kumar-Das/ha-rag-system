import { retrieveRelevantChunks } from "../services/retrievalService.js";
import { streamAnswer } from "../services/llmService.js";
import { verifyAnswer } from "../services/verificationService.js";
import { getCache, setCache } from "../services/cacheService.js";
import { classifyQuery } from "../services/classificationService.js";
import { rewriteQuery } from "../services/queryRewriteService.js";
import { createSseStream } from "../utils/sse.js";
import Document from "../models/Document.js";
import Workspace from "../models/Workspace.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

const CHAT_HISTORY_LIMIT = parseInt(process.env.CHAT_HISTORY_LIMIT, 10) || 10;

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

/**
 * Fire-and-forget: persist in the background without blocking the response.
 */
const persistInBackground = (fn) => {
    fn().catch(err => console.error("[ASK] Background persist error:", err.message));
};

const persistAssistantMessage = (chatId, content, sources = []) => {
    persistInBackground(async () => {
        await Promise.all([
            Message.create({ chatId, role: "assistant", content, sources }),
            Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() })
        ]);
    });
};

const streamStaticAnswer = async (stream, chatId, answer, sources = [], verification = null) => {
    stream.send("token", { text: answer });
    stream.send("sources", { sources, verification });
    stream.send("done", { answer });
    stream.close();

    persistAssistantMessage(chatId, answer, sources);
};

const streamError = (stream, message) => {
    stream.send("error", { message });
    stream.close();
};

const resolveQuestionScope = async ({ userId, workspaceId, documentId, documentIds, existingChat }) => {
    const requestedWorkspaceId = workspaceId || existingChat?.workspaceId || null;
    const requestedDocumentId = documentId || existingChat?.documentId || null;

    if (requestedWorkspaceId) {
        const workspace = await Workspace.findOne({ _id: requestedWorkspaceId, userId }).lean();
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
            ? await Document.find({ _id: { $in: workspaceDocumentIds }, userId }).lean().sort({ uploadDate: -1 })
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
        const doc = await Document.findById(requestedDocumentId).lean();
        if (!doc) {
            throw createHttpError(404, "Selected document not found");
        }

        if (String(doc.userId) !== String(userId)) {
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

    const latestDoc = await Document.findOne({ userId }).lean().sort({ uploadDate: -1 });
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

/**
 * Fallback message used when retrieval returns no relevant chunks
 * or the query is unsupported.
 */
const NO_RELEVANT_INFO = "I couldn't find relevant information about this topic in the uploaded documents. The documents may not cover this subject, or you could try rephrasing your question.";

/**
 * Get a user-friendly error message from an error object.
 */
const getUserFriendlyError = (error) => {
    if (error.status) return error.message;

    const msg = error.message || "";
    const code = error.code || "";

    // Network / timeout errors
    if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ECONNABORTED") {
        return "The AI service is temporarily unavailable. Please try again in a moment.";
    }

    // OpenAI rate limit
    if (msg.includes("429") || msg.includes("rate limit") || msg.includes("Rate limit")) {
        return "The AI service is currently busy. Please wait a few seconds and try again.";
    }

    // OpenAI context length
    if (msg.includes("context_length") || msg.includes("maximum context")) {
        return "Your question combined with the document context is too long. Try asking about a more specific topic.";
    }

    // OpenAI API key issues
    if (msg.includes("401") || msg.includes("Incorrect API key") || msg.includes("invalid_api_key")) {
        return "There's a configuration issue with the AI service. Please contact the administrator.";
    }

    // Pinecone errors
    if (msg.includes("Pinecone") || msg.includes("pinecone") || msg.includes("vector")) {
        return "The document search service encountered an error. Please try again.";
    }

    // Generic but still informative
    return `Something went wrong while generating the answer. Please try again. (${msg.substring(0, 80)})`;
};

export const askQuestion = async (req, res) => {
    let stream = null;
    const abortController = new AbortController();
    const timings = {};

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

        const requestStart = Date.now();
        console.log("\n════════════════════════════════════════════════════════════════");
        console.log(`[ASK] New request at ${new Date(requestStart).toISOString()}`);
        console.log("[ASK] Question:", question);
        console.log("[ASK] DocumentId:", documentId);
        console.log("[ASK] WorkspaceId:", workspaceId);

        let targetChatId = chatId;
        let chatHistory = [];
        let existingChat = null;

        if (targetChatId) {
            existingChat = await Chat.findById(targetChatId).lean();
            if (!existingChat) return res.status(404).json({ error: "Chat not found" });

            if (String(existingChat.userId) !== String(userId)) {
                return res.status(403).json({ error: "Not authorized to access this chat" });
            }

            chatHistory = await Message.find({ chatId: targetChatId })
                .sort({ createdAt: 1 })
                .limit(CHAT_HISTORY_LIMIT)
                .lean();
            console.log("[ASK] Chat history length:", chatHistory.length);
        }

        // ── 1b. Rewrite follow-up queries using conversation history ────
        //
        // The rewritten query is used ONLY for retrieval and classification.
        // The original question is kept for display and the LLM prompt.
        //
        let retrievalQuery = question;
        let rewriteMethod = "none";

        if (chatHistory.length > 0) {
            const rewriteResult = await rewriteQuery(question, chatHistory);
            retrievalQuery = rewriteResult.rewritten;
            rewriteMethod = rewriteResult.method;
            if (rewriteMethod !== "none") {
                console.log(`[ASK] Query rewritten (${rewriteMethod}): "${question}" → "${retrievalQuery}"`);
            }
        }

        // ── 2. Classify query (local heuristics — <1ms) ─────────────────
        // Use the rewritten query for classification so follow-ups get
        // appropriate topK and query type.
        const classifyStart = Date.now();
        const classification = classifyQuery(retrievalQuery);
        timings.classifyMs = Date.now() - classifyStart;
        console.log(`[ASK] Classification: ${JSON.stringify(classification)} (${timings.classifyMs}ms)`);

        // ── 2. Resolve document scope ────────────────────────────────────
        const scopeStart = Date.now();
        const scope = await resolveQuestionScope({
            userId,
            workspaceId,
            documentId,
            documentIds,
            existingChat
        });
        timings.scopeResolveMs = Date.now() - scopeStart;

        const retrievalTargets = scope.targetDocs.map(toDocumentTarget);
        const activeDocumentIds = scope.targetDocs.map(doc => doc._id.toString());
        console.log("[ASK] Resolved targets:", retrievalTargets.map(target => target.fileName));

        // ── 3. Create/update chat ────────────────────────────────────────
        if (!targetChatId) {
            const title = question.length > 60 ? question.substring(0, 57) + "..." : question.substring(0, 60);
            const newChat = await Chat.create({
                title: title || "New Chat",
                documentId: scope.targetDocumentId,
                workspaceId: scope.workspaceId,
                activeDocumentIds,
                userId
            });
            targetChatId = newChat._id;
        } else {
            // Fire-and-forget chat update
            persistInBackground(() => Chat.findByIdAndUpdate(targetChatId, {
                documentId: scope.targetDocumentId,
                workspaceId: scope.workspaceId,
                activeDocumentIds,
                updatedAt: new Date()
            }));
        }

        // Fire-and-forget user message persistence
        persistInBackground(() => Message.create({
            chatId: targetChatId,
            role: "user",
            content: question
        }));

        // ── 4. Setup SSE stream ──────────────────────────────────────────
        res.setHeader("X-Chat-Id", targetChatId.toString());
        stream = createSseStream(req, res);
        stream.send("meta", {
            chatId: targetChatId.toString(),
            workspaceId: scope.workspaceId,
            documentIds: activeDocumentIds
        });

        req.on("close", () => abortController.abort());

        if (retrievalTargets.length === 0) {
            await streamStaticAnswer(stream, targetChatId, "No active documents found. Please select a document or add documents to this workspace.", []);
            logTimings(timings, requestStart);
            return;
        }

        // ── 5. Check cache ───────────────────────────────────────────────
        const cached = getCache(question, scope.cacheScope);
        if (cached) {
            console.log("[ASK] CACHE HIT:", question);
            await streamStaticAnswer(
                stream,
                targetChatId,
                cached.answer,
                cached.sources || [],
                cached.verification || null
            );
            logTimings(timings, requestStart);
            return;
        }

        // ── 6. Retrieve relevant chunks ─────────────────────────────────
        stream.send("status", { stage: "retrieving" });
        const retrievalStart = Date.now();

        let chunks;
        try {
            chunks = await retrieveRelevantChunks(retrievalQuery, retrievalTargets, {
                topK: classification.topK,
                queryType: classification.type,
                timings
            });
        } catch (retrievalError) {
            console.error("[ASK] Retrieval failed:", retrievalError.message);
            // Don't bail out completely — try to give a helpful response
            chunks = [];
        }

        timings.totalRetrievalMs = Date.now() - retrievalStart;
        console.log(`[ASK] Retrieval complete: ${chunks?.length || 0} chunks in ${timings.totalRetrievalMs}ms`);

        // ── 7. Handle no-results ─────────────────────────────────────────
        if (!chunks || chunks.length === 0) {
            // For "unsupported" queries, give a clear off-topic message
            if (classification.type === "unsupported") {
                await streamStaticAnswer(
                    stream,
                    targetChatId,
                    "This question doesn't seem related to the uploaded documents. I can only answer questions based on the content of your uploaded research documents.",
                    []
                );
            } else {
                await streamStaticAnswer(stream, targetChatId, NO_RELEVANT_INFO, []);
            }
            logTimings(timings, requestStart);
            return;
        }

        // ── 8. Build context ─────────────────────────────────────────────
        const context = chunks
            .map(c => c.text)
            .filter(Boolean)
            .join("\n---\n");
        console.log("[ASK] Context length (chars):", context.length);

        if (!context || context.trim().length === 0) {
            await streamStaticAnswer(stream, targetChatId, NO_RELEVANT_INFO, []);
            logTimings(timings, requestStart);
            return;
        }

        // ── 9. Build sources ─────────────────────────────────────────────
        const sources = chunks.map(c => ({
            text: c.text,
            fileName: c.fileName,
            chunkIndex: c.chunkIndex,
            documentId: c.documentId,
            namespace: c.namespace
        }));

        // ── 10. Stream LLM response ─────────────────────────────────────
        let fullAnswer = "";
        let verification = null;

        try {
            console.log("[ASK] Streaming started");
            stream.send("status", { stage: "generating" });

            fullAnswer = await streamAnswer(
                question,
                chunks,
                chatHistory,
                (token) => {
                    if (!stream.isClosed()) {
                        stream.send("token", { text: token });
                    }
                },
                { signal: abortController.signal, timings }
            );
            console.log("[ASK] Streaming finished");
        } catch (err) {
            if (abortController.signal.aborted || stream.isClosed()) {
                console.log("[ASK] Client disconnected during streaming");
                logTimings(timings, requestStart);
                return;
            }

            // If we already streamed some content, append error notice
            if (fullAnswer) {
                console.error("[ASK] Streaming error after partial response:", err.message);
                stream.send("token", { text: "\n\n*(Response was interrupted due to an error)*" });
                stream.send("sources", { sources, verification: null });
                stream.send("done", { answer: fullAnswer + "\n\n*(Response was interrupted due to an error)*" });
                stream.close();
                persistAssistantMessage(targetChatId, fullAnswer, sources);
                logTimings(timings, requestStart);
                return;
            }

            throw err;
        }

        if (abortController.signal.aborted || stream.isClosed()) {
            console.log("[ASK] Client disconnected before stream completion");
            logTimings(timings, requestStart);
            return;
        }

        if (!fullAnswer) {
            fullAnswer = "I couldn't generate a response based on the available context. Please try rephrasing your question.";
            stream.send("token", { text: fullAnswer });
        }

        // ── 11. Verification (optional) ──────────────────────────────────
        if (mode === "verified" && fullAnswer) {
            try {
                stream.send("status", { stage: "verifying" });
                const verifyStart = Date.now();
                verification = await verifyAnswer(question, fullAnswer, chunks);
                timings.verificationMs = Date.now() - verifyStart;
                console.log(`[ASK] Verification: ${verification.confidence} (${timings.verificationMs}ms)`);
            } catch (verifyErr) {
                console.error("[ASK] Verification failed (non-critical):", verifyErr.message);
                // Verification is optional — don't fail the whole request
            }
        }

        // ── 12. Send sources and finalize ────────────────────────────────
        stream.send("sources", { sources, verification });
        stream.send("done", { answer: fullAnswer });
        stream.close();

        // Persist and cache in background — don't block
        if (fullAnswer) {
            persistAssistantMessage(targetChatId, fullAnswer, sources);
            setCache(question, { answer: fullAnswer, sources, verification }, scope.cacheScope);
        }

        logTimings(timings, requestStart);
    } catch (error) {
        console.error("ASK ERROR:", error);

        if (stream && !stream.isClosed()) {
            streamError(stream, getUserFriendlyError(error));
            return;
        }

        if (!res.headersSent) {
            return res.status(error.status || 500).json({
                error: getUserFriendlyError(error)
            });
        }

        if (!res.writableEnded) {
            res.end();
        }
    }
};

/**
 * Log comprehensive timing breakdown for performance benchmarking.
 */
function logTimings(timings, requestStart) {
    const totalMs = Date.now() - requestStart;
    console.log("\n┌── PERFORMANCE METRICS ─────────────────────────────────────");
    console.log(`│ Classification:       ${timings.classifyMs ?? "-"}ms`);
    console.log(`│ Scope resolution:     ${timings.scopeResolveMs ?? "-"}ms`);
    console.log(`│ Embedding generation: ${timings.embeddingMs ?? "-"}ms`);
    console.log(`│ Vector search:        ${timings.vectorSearchMs ?? "-"}ms`);
    console.log(`│ Keyword search:       ${timings.keywordSearchMs ?? "-"}ms`);
    console.log(`│ Merge + dedup:        ${timings.mergeMs ?? "-"}ms`);
    console.log(`│ Total retrieval:      ${timings.totalRetrievalMs ?? "-"}ms`);
    console.log(`│ TTFT (first token):   ${timings.ttftMs ?? "-"}ms`);
    console.log(`│ LLM total stream:     ${timings.llmTotalMs ?? "-"}ms`);
    console.log(`│ Verification:         ${timings.verificationMs ?? "-"}ms`);
    console.log(`│ ──────────────────────────────────────────────────────────`);
    console.log(`│ TOTAL REQUEST TIME:   ${totalMs}ms`);
    console.log(`└───────────────────────────────────────────────────────────\n`);
}
