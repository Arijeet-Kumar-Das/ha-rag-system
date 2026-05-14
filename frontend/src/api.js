const API_BASE = "/api";

/** Get the stored JWT token */
const getToken = () => localStorage.getItem("ha_rag_token");

/** Build auth headers */
const authHeaders = (extra = {}) => ({
  Authorization: `Bearer ${getToken()}`,
  ...extra,
});

const scheduleTokenFlush = (flush) => {
  if (typeof requestAnimationFrame === "function") {
    const frameId = requestAnimationFrame(flush);
    return () => cancelAnimationFrame(frameId);
  }

  const timeoutId = setTimeout(flush, 16);
  return () => clearTimeout(timeoutId);
};

const createTokenBatcher = (onToken) => {
  let pendingText = "";
  let latestSources = [];
  let cancelScheduled = null;

  const flush = () => {
    cancelScheduled = null;
    if (!pendingText) return;

    const text = pendingText;
    pendingText = "";
    onToken?.(text, latestSources);
  };

  return {
    push(text, sources) {
      if (!text) return;

      pendingText += text;
      latestSources = sources || latestSources;

      if (!cancelScheduled) {
        cancelScheduled = scheduleTokenFlush(flush);
      }
    },
    flushNow() {
      if (cancelScheduled) {
        cancelScheduled();
        cancelScheduled = null;
      }
      flush();
    },
  };
};

const parseSseFrame = (frame) => {
  const lines = frame.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let event = "message";
  const dataLines = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;

    const separatorIndex = line.indexOf(":");
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    const value = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1).replace(/^ /, "");

    if (field === "event") event = value;
    if (field === "data") dataLines.push(value);
  }

  if (!dataLines.length && event === "message") return null;

  const rawData = dataLines.join("\n");
  let data = {};

  if (rawData) {
    try {
      data = JSON.parse(rawData);
    } catch {
      data = { raw: rawData };
    }
  }

  return { event, data };
};

/**
 * Stream an answer from the RAG backend.
 * Calls onToken for each chunk of text received.
 * Returns the full accumulated answer when done.
 */
export const askQuestion = async (question, target, chatId, onToken, mode = "standard") => {
  const targetPayload = typeof target === "object" && target !== null
    ? target
    : { documentId: target };

  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    }),
    body: JSON.stringify({ question, ...targetPayload, chatId, mode }),
  });

  const newChatId = res.headers.get("X-Chat-Id") || null;

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }

  const contentType = res.headers.get("Content-Type") || "";

  let sources = [];
  let verification = null;

  if (contentType.includes("application/json")) {
    const data = await res.json();
    sources = data.sources || sources;
    if (data.answer) {
      onToken(data.answer, sources);
    }
    return { answer: data.answer || "", sources, verification, chatId: newChatId };
  }

  if (!res.body) {
    throw new Error("Streaming is not supported by this browser");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const batcher = createTokenBatcher(onToken);
  let full = "";
  let finalChatId = newChatId;
  let buffer = "";

  const handleEvent = (parsed) => {
    if (!parsed) return;

    const { event, data } = parsed;

    if (event === "meta") {
      finalChatId = data.chatId || finalChatId;
      return;
    }

    if (event === "token") {
      const text = data.text || "";
      full += text;
      batcher.push(text, sources);
      return;
    }

    if (event === "sources") {
      sources = data.sources || sources;
      verification = data.verification || null;
      return;
    }

    if (event === "done") {
      if (!full && data.answer) full = data.answer;
      return;
    }

    if (event === "error") {
      throw new Error(data.message || "Streaming failed");
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || "";

      for (const frame of frames) {
        handleEvent(parseSseFrame(frame));
      }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      handleEvent(parseSseFrame(buffer));
    }
  } finally {
    batcher.flushNow();
  }

  return { answer: full, sources, verification, chatId: finalChatId };
};

/**
 * Upload a PDF file to the backend.
 */
export const uploadFile = async (file, workspaceId) => {
  const formData = new FormData();
  formData.append("file", file);
  if (workspaceId) formData.append("workspaceId", workspaceId);

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
 * Workspace APIs
 */
export const getWorkspaces = async () => {
  const res = await fetch(`${API_BASE}/workspace`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch workspaces");
  }
  return res.json();
};

export const createWorkspace = async ({ name, documentIds = [] }) => {
  const res = await fetch(`${API_BASE}/workspace`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name, documentIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create workspace");
  }
  return res.json();
};

export const updateWorkspace = async (workspaceId, data) => {
  const res = await fetch(`${API_BASE}/workspace/${workspaceId}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update workspace");
  }
  return res.json();
};

export const addWorkspaceDocuments = async (workspaceId, documentIds) => {
  const res = await fetch(`${API_BASE}/workspace/${workspaceId}/documents`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ documentIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to add documents");
  }
  return res.json();
};

export const removeWorkspaceDocument = async (workspaceId, documentId) => {
  const res = await fetch(`${API_BASE}/workspace/${workspaceId}/documents/${documentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to remove document");
  }
  return res.json();
};

export const deleteWorkspace = async (workspaceId) => {
  const res = await fetch(`${API_BASE}/workspace/${workspaceId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete workspace");
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

export const getChatsByWorkspace = async (workspaceId) => {
  const res = await fetch(`${API_BASE}/chat/workspace/${workspaceId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch workspace chats");
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
