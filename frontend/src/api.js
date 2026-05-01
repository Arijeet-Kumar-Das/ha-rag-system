const API_BASE = "/api";

/** Get the stored JWT token */
const getToken = () => localStorage.getItem("ha_rag_token");

/** Build auth headers */
const authHeaders = (extra = {}) => ({
  Authorization: `Bearer ${getToken()}`,
  ...extra,
});

/**
 * Stream an answer from the RAG backend.
 * Calls onToken for each chunk of text received.
 * Returns the full accumulated answer when done.
 */
export const askQuestion = async (question, documentId, chatId, onToken, mode = "standard") => {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ question, documentId, chatId, mode }),
  });

  const newChatId = res.headers.get("X-Chat-Id") || null;

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }

  const contentType = res.headers.get("Content-Type") || "";

  let sources = [];
  let verification = null;
  try {
    const sourcesHeader = res.headers.get("X-Sources");
    if (sourcesHeader) {
      sources = JSON.parse(decodeURIComponent(sourcesHeader));
    }
  } catch (e) {
    console.error("Failed to parse sources header", e);
  }

  // If the response is JSON (cache hit, DB route, or error), parse it
  if (contentType.includes("application/json")) {
    const data = await res.json();
    sources = data.sources || sources;
    if (data.answer) {
      onToken(data.answer, sources);
    }
    return { answer: data.answer || "", sources, verification, chatId: newChatId };
  }

  // Otherwise stream token-by-token
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;

    // Check if this chunk contains the sources delimiter
    if (full.includes("__SOURCES__")) {
      // Don't send the delimiter or sources JSON as tokens
      const delimiterIndex = full.lastIndexOf("\n\n__SOURCES__");
      const answerPart = full.substring(0, delimiterIndex);
      // Only send the new answer content that hasn't been sent yet
      const alreadySentLength = full.length - chunk.length;
      if (delimiterIndex > alreadySentLength) {
        const unsent = answerPart.substring(alreadySentLength);
        if (unsent) onToken(unsent, sources);
      }

      // Parse payload from the delimiter (now contains {sources, verification})
      try {
        const payloadJson = full.substring(full.lastIndexOf("__SOURCES__") + "__SOURCES__".length);
        const payload = JSON.parse(payloadJson);
        sources = payload.sources || sources;
        verification = payload.verification || null;
      } catch (e) {
        console.error("Failed to parse inline payload", e);
      }
      full = answerPart;
    } else {
      onToken(chunk, sources);
    }
  }

  // Final check: if the delimiter wasn't caught mid-chunk
  if (full.includes("__SOURCES__")) {
    const delimiterIndex = full.lastIndexOf("\n\n__SOURCES__");
    try {
      const payloadJson = full.substring(full.lastIndexOf("__SOURCES__") + "__SOURCES__".length);
      const payload = JSON.parse(payloadJson);
      sources = payload.sources || sources;
      verification = payload.verification || null;
    } catch (e) {
      console.error("Failed to parse inline payload", e);
    }
    full = full.substring(0, delimiterIndex);
  }

  return { answer: full, sources, verification, chatId: newChatId };
};

/**
 * Upload a PDF file to the backend.
 */
export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Upload failed");
  }

  return res.json();
};

/**
 * Fetch all available documents for the workspace.
 */
export const getDocuments = async () => {
  const res = await fetch(`${API_BASE}/document`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch documents");
  }
  return res.json();
};

/**
 * Chat APIs
 */
export const getChatsByDocument = async (documentId) => {
  const res = await fetch(`${API_BASE}/chat/${documentId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch chats");
  return res.json();
};

export const getChatMessages = async (chatId) => {
  const res = await fetch(`${API_BASE}/chat/detail/${chatId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
};

export const deleteChat = async (chatId) => {
  const res = await fetch(`${API_BASE}/chat/${chatId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete chat");
  return res.json();
};
