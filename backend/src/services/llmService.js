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
    grouped[file].forEach((chunk) => {
      if (chunk.text) {
        const sourceLabel = `[${file}:${chunk.chunkIndex ?? "?"}]`;
        sortedContexts.push(`${sourceLabel}\n${chunk.text}`);
      }
    });
  }

  // 3. Limit total context size — reduced for faster TTFT
  let joinedContext = "";
  let currentWordCount = 0;
  const MAX_WORDS = 800;

  for (const text of sortedContexts) {
    const words = text.split(/\s+/);
    if (currentWordCount + words.length > MAX_WORDS) {
      const remaining = MAX_WORDS - currentWordCount;
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
  const MAX_HISTORY_WORDS = 500;
  const MAX_PER_MESSAGE_WORDS = 200;
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

  return [
    {
      role: "system",
      content:
        "You are an academic assistant. Answer using the provided context.\nCite document names when making document-specific claims.\nIf context doesn't contain the answer, say so clearly.\nDo NOT hallucinate beyond context.",
    },
    ...historyMessages,
    {
      role: "user",
      content: `Context:\n${joinedContext}\n\nQuestion:\n${question}`,
    },
  ];
};

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
    model: "gpt-4o-mini",
    temperature: 0.2,
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

  const requestStart = Date.now();
  console.log(
    `[LLM Stream] OpenAI request start: ${new Date(requestStart).toISOString()}`,
  );

  try {
    const requestOptions = options.signal
      ? { signal: options.signal }
      : undefined;
    const stream = await getClient().chat.completions.create(
      {
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 1024,
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
  } finally {
    const totalStreamTime = Date.now() - requestStart;
    console.log(`[LLM Stream] Total stream time: ${totalStreamTime}ms`);
    if (options.timings) {
      options.timings.llmTotalMs = totalStreamTime;
    }
  }

  return fullAnswer.trim();
};
