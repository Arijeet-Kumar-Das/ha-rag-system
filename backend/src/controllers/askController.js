import { retrieveRelevantChunks } from "../services/retrievalService.js";
import { generateAnswer, streamAnswer } from "../services/llmService.js";
import { verifyAnswer } from "../services/verificationService.js";
import { getCache, setCache } from "../services/cacheService.js";
import { classifyQuery } from "../services/classificationService.js";

export const askQuestion = async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({ error: "Question is required" });
        }

        // 0. Check cache first
        const cached = getCache(question);
        if (cached) {
            console.log("CACHE HIT:", question);
            return res.json(cached);
        }

        // 1. Classify query
        const queryType = await classifyQuery(question);
        console.log("QUERY TYPE:", queryType);

        if (queryType === "DB") {
            return res.json({
                answer: "This will be fetched from database",
                sources: []
            });
        }

        const startTime = Date.now();

        console.time("Retrieval");
        // 2. Retrieve chunks (RAG path)
        const chunks = await retrieveRelevantChunks(question);
        console.timeEnd("Retrieval");

        if (chunks.length === 0) {
            return res.json({
                answer: "No relevant information found",
                sources: []
            });
        }

        console.time("LLM Generation");
        // 3. Generate full answer (NOT streaming yet)
        const answer = await generateAnswer(question, chunks);
        console.timeEnd("LLM Generation");

        console.time("Verification");
        // 4. Verify answer
        const isValid = await verifyAnswer(question, answer, chunks);
        console.timeEnd("Verification");

        if (!isValid) {
            return res.json({
                answer: "Answer not found in provided documents.",
                sources: []
            });
        }

        // 5. Cache the verified answer
        const sources = chunks.map(c => ({
            text: c.text,
            fileName: c.fileName,
            chunkIndex: c.chunkIndex
        }));
        setCache(question, { answer, sources });

        // 6. Stream the verified answer
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Transfer-Encoding", "chunked");
        res.setHeader("X-Sources", encodeURIComponent(JSON.stringify(sources)));

        console.time("LLM Streaming");
        await streamAnswer(question, chunks, res);
        console.timeEnd("LLM Streaming");
        
        console.log(`Total RAG request time: ${Date.now() - startTime}ms`);

    } catch (error) {
        console.error("ASK ERROR:", error);
        res.status(500).json({ error: "Streaming failed" });
    }
};