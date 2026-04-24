const API_BASE = "/api";

/**
 * Stream an answer from the RAG backend.
 * Calls onToken for each chunk of text received.
 * Returns the full accumulated answer when done.
 */
export const askQuestion = async (question, onToken) => {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }

  const contentType = res.headers.get("Content-Type") || "";

  let sources = [];
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
    return { answer: data.answer || "", sources };
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
    onToken(chunk, sources);
  }

  return { answer: full, sources };
};

/**
 * Upload a PDF file to the backend.
 */
export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Upload failed");
  }

  return res.json();
};
