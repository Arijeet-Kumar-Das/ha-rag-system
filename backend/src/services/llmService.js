import OpenAI from "openai";

let client;
const getClient = () => {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
};

// ── Constants ──────────────────────────────────────────────────────────
const MODEL = "gpt-4o-mini";
const TEMPERATURE = 0.2;
const MAX_TOKENS = 2048;          // Increased from 1024 for multi-doc workspace answers
const MAX_CONTEXT_WORDS = 1200;   // Increased from 800 for better coverage in workspace mode
const MAX_HISTORY_WORDS = 500;
const MAX_PER_MESSAGE_WORDS = 200;
const REQUEST_TIMEOUT_MS = 45000; // 45-second timeout for OpenAI requests
const MAX_RETRIES = 1;            // Single retry for transient errors

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
    grouped[file].forEach((chunk) => {
      if (chunk.text) {
        const sourceLabel = `[${file}:${chunk.chunkIndex ?? "?"}]`;
        sortedContexts.push(`${sourceLabel}\n${chunk.text}`);
      }
    });
  }

  // 3. Limit total context size
  let joinedContext = "";
  let currentWordCount = 0;

  for (const text of sortedContexts) {
    const words = text.split(/\s+/);
    if (currentWordCount + words.length > MAX_CONTEXT_WORDS) {
      const remaining = MAX_CONTEXT_WORDS - currentWordCount;
      if (remaining > 0) {
        joinedContext +=
          (joinedContext ? "\n---\n" : "") +
          words.slice(0, remaining).join(" ");
      }
      break;
    }
    joinedContext += (joinedContext ? "\n---\n" : "") + text;
    currentWordCount += words.length;
  }

  // 4. Prepend chatHistory (limit to last 3 messages, trim each)
  let historyWordCount = 0;

  const trimmedHistory = chatHistory.slice(-3);
  const historyMessages = [];

  for (const msg of trimmedHistory) {
    const words = (msg.content || "").split(/\s+/);
    const trimmedWords = words.slice(0, MAX_PER_MESSAGE_WORDS);
    const trimmedContent =
      trimmedWords.join(" ") +
      (words.length > MAX_PER_MESSAGE_WORDS ? "..." : "");

    if (historyWordCount + trimmedWords.length > MAX_HISTORY_WORDS) {
      break;
    }

    historyMessages.push({
      role: msg.role,
      content: trimmedContent,
    });
    historyWordCount += trimmedWords.length;
  }

  console.log(
    `[LLM] Chat history: ${historyMessages.length} messages, ~${historyWordCount} words`,
  );
  console.log(
    `[LLM] Context: ~${currentWordCount} words from ${chunks.length} chunks`,
  );

  // Count unique document sources for multi-doc awareness
  const uniqueFiles = new Set(chunks.map(c => c.fileName).filter(Boolean));
  const multiDocNote = uniqueFiles.size > 1
    ? `\nYou have context from ${uniqueFiles.size} documents: ${[...uniqueFiles].join(", ")}. Reference specific document names when citing information.`
    : "";

  return [
    {
      role: "system",
      content:
        `You are an academic research assistant. Answer the user's question thoroughly using ONLY the provided context.${multiDocNote}

Guidelines:
- Cite document names when making document-specific claims.
- If the context contains relevant information, provide a comprehensive answer.
- If the context does NOT contain the answer, say so clearly — do NOT make up information.
- For multi-part questions, address each part systematically.
- Use markdown formatting (headers, lists, bold) for readability.`
    },
    ...historyMessages,
    {
      role: "user",
      content: `Context:\n${joinedContext}\n\nQuestion:\n${question}`,
    },
  ];
};

/**
 * Check if an error is retryable (transient network/rate issues).
 */
const isRetryableError = (err) => {
  const msg = (err.message || "").toLowerCase();
  const code = err.code || "";
  const status = err.status || err.statusCode || 0;

  // Network errors
  if (["ECONNRESET", "ETIMEDOUT", "ECONNABORTED", "EPIPE", "EAI_AGAIN"].includes(code)) return true;

  // Rate limit
  if (status === 429) return true;

  // Server errors (500, 502, 503)
  if (status >= 500 && status < 600) return true;

  // OpenAI-specific transient errors
  if (msg.includes("rate limit") || msg.includes("overloaded") || msg.includes("capacity")) return true;

  return false;
};

/**
 * Wait for a specified duration (used between retries).
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const generateAnswer = async (question, chunks) => {
  console.log(`[LLM] Retrieved chunks count: ${chunks?.length || 0}`);

  const messages = buildMessages(question, chunks);
  if (!messages) {
    return "Not enough information found in documents.";
  }

  const userMessage = messages[messages.length - 1];
  const contextLength = userMessage.content.split(/\s+/).length;
  console.log(`[LLM] Final selected chunks for context: ${chunks.length}`);
  console.log(`[LLM] Context length (words): ${contextLength}`);

  console.time("LLM Response Time");
  const response = await getClient().chat.completions.create({
    model: MODEL,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    messages,
  });
  console.timeEnd("LLM Response Time");

  return response.choices[0].message.content.trim();
};

export const streamAnswer = async (
  question,
  chunks,
  chatHistory = [],
  onToken,
  options = {},
) => {
  if (typeof onToken !== "function") {
    throw new Error("streamAnswer requires an onToken callback");
  }

  console.log(`[LLM Stream] Retrieved chunks count: ${chunks?.length || 0}`);

  const messages = buildMessages(question, chunks, chatHistory);
  if (!messages) {
    return "Not enough information found in documents.";
  }

  const userMessage = messages[messages.length - 1];
  const contextLength = userMessage.content.split(/\s+/).length;
  console.log(
    `[LLM Stream] Final selected chunks for context: ${chunks.length}`,
  );
  console.log(`[LLM Stream] Context length (words): ${contextLength}`);

  let fullAnswer = "";
  let firstTokenReceived = false;
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[LLM Stream] Retry attempt ${attempt}/${MAX_RETRIES} after error: ${lastError?.message}`);
      await sleep(1000 * attempt); // Exponential-ish backoff: 1s, 2s
    }

    const requestStart = Date.now();
    console.log(
      `[LLM Stream] OpenAI request start (attempt ${attempt + 1}): ${new Date(requestStart).toISOString()}`,
    );

    // Reset state for retry
    fullAnswer = "";
    firstTokenReceived = false;

    try {
      // Build request options with timeout
      const requestOptions = {};
      if (options.signal) {
        requestOptions.signal = options.signal;
      }
      requestOptions.timeout = REQUEST_TIMEOUT_MS;

      const stream = await getClient().chat.completions.create(
        {
          model: MODEL,
          temperature: TEMPERATURE,
          max_tokens: MAX_TOKENS,
          stream: true,
          messages,
        },
        requestOptions,
      );

      for await (const chunk of stream) {
        if (options.signal?.aborted) break;

        const token = chunk.choices?.[0]?.delta?.content;
        if (token) {
          if (!firstTokenReceived) {
            firstTokenReceived = true;
            const ttft = Date.now() - requestStart;
            console.log(`[LLM Stream] ⚡ TTFT (Time To First Token): ${ttft}ms`);
            // Report TTFT through timings if provided
            if (options.timings) {
              options.timings.ttftMs = ttft;
            }
          }
          onToken(token);
          fullAnswer += token;
        }
      }

      // Success — break out of retry loop
      const totalStreamTime = Date.now() - requestStart;
      console.log(`[LLM Stream] Total stream time: ${totalStreamTime}ms`);
      if (options.timings) {
        options.timings.llmTotalMs = totalStreamTime;
      }

      return fullAnswer.trim();

    } catch (err) {
      lastError = err;

      const totalStreamTime = Date.now() - requestStart;
      console.error(`[LLM Stream] Error after ${totalStreamTime}ms (attempt ${attempt + 1}):`, err.message);
      if (options.timings) {
        options.timings.llmTotalMs = totalStreamTime;
      }

      // If client disconnected, don't retry
      if (options.signal?.aborted) {
        throw err;
      }

      // If we already sent tokens to the client, we can't retry (would duplicate content)
      if (firstTokenReceived) {
        console.log("[LLM Stream] Cannot retry — tokens already sent to client");
        throw err;
      }

      // Check if the error is retryable
      if (!isRetryableError(err) || attempt >= MAX_RETRIES) {
        throw err;
      }

      console.log(`[LLM Stream] Retryable error detected, will retry...`);
    }
  }

  // Should not reach here, but just in case
  if (lastError) throw lastError;
  return fullAnswer.trim();
};
