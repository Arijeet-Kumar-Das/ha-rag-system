import { useState, useRef, useEffect } from "react"
import ChatMessage from "./ChatMessage"
import LoadingDots from "./LoadingDots"
import { askQuestion, uploadFile, getChatMessages, getDocuments } from "../api"

export default function Chat({ pendingPrompt, clearPendingPrompt, selectedDocumentId, fetchDocs, selectedChatId, setSelectedChatId, fetchChats, selectedDocName }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [mode, setMode] = useState("standard") // "standard" | "verified"
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const hasHandledPrompt = useRef(false)
  const skipReload = useRef(false) // Prevents useEffect from reloading after streaming sets a new chatId

  const welcomeMessage = {
    role: "assistant",
    content: selectedDocName
      ? `I'm ready to answer questions about **${selectedDocName}**. What would you like to know?`
      : "Hello! I'm your AI academic assistant. Select a document or upload one to get started."
  }

  useEffect(() => {
    // Skip reload if this chatId change came from streaming (answer is already in state)
    if (skipReload.current) {
      skipReload.current = false;
      return;
    }

    if (selectedChatId) {
      setIsLoading(true);
      getChatMessages(selectedChatId).then(history => {
        setMessages(history.map(msg => ({
          role: msg.role,
          content: msg.content,
          sources: msg.sources || []
        })));
        setIsLoading(false);
      }).catch(err => {
        setIsLoading(false);
        console.error("Failed to load history", err);
      });
    } else {
      setMessages([welcomeMessage]);
    }
  }, [selectedChatId])

  // Update welcome message when document changes (only if no chat selected)
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([welcomeMessage]);
    }
  }, [selectedDocumentId])

  useEffect(() => {
    if (pendingPrompt && !hasHandledPrompt.current) {
      hasHandledPrompt.current = true
      setInput(pendingPrompt)
      clearPendingPrompt?.()
    }
  }, [pendingPrompt, clearPendingPrompt])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    let resolvedDocumentId = selectedDocumentId
    if (!resolvedDocumentId) {
      try {
        const docs = await getDocuments()
        if (docs && docs.length > 0) {
          const latestDoc = [...docs].sort(
            (a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime()
          )[0]
          resolvedDocumentId = latestDoc?._id || docs[0]._id
        }
      } catch (err) {
        console.error("Failed to resolve latest document", err)
      }
    }

    if (!resolvedDocumentId) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Please select or upload a document before asking a question." },
      ])
      return
    }

    const userText = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userText }])
    setIsLoading(true)

    let isFirstToken = true

    try {
      const result = await askQuestion(userText, resolvedDocumentId, selectedChatId, (token, currentSources) => {
        if (isFirstToken) {
          setIsLoading(false)
          isFirstToken = false
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: token, streaming: true, sources: currentSources || [] },
          ])
        } else {
          setMessages((prev) => {
            const newMsgs = [...prev]
            const lastIdx = newMsgs.length - 1
            newMsgs[lastIdx] = {
              ...newMsgs[lastIdx],
              content: newMsgs[lastIdx].content + token,
            }
            return newMsgs
          })
        }
      }, mode) // Pass mode as 5th argument

      setMessages((prev) => {
        const newMsgs = [...prev]
        const lastIdx = newMsgs.length - 1
        newMsgs[lastIdx] = {
          ...newMsgs[lastIdx],
          streaming: false,
          sources: result?.sources || newMsgs[lastIdx].sources,
          verification: result?.verification || null,
        }
        return newMsgs
      })

      if (result?.chatId && result.chatId !== selectedChatId) {
        skipReload.current = true; // Prevent useEffect from reloading — we already have the messages
        setSelectedChatId(result.chatId);
        if (fetchChats) fetchChats();
      }
    } catch (err) {
      setIsLoading(false)
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}` }])
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setMessages((prev) => [...prev, { role: "user", content: `📄 Uploading ${file.name}...` }])

    try {
      const res = await uploadFile(file)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Successfully uploaded **${file.name}**.\nStored ${res.storedVectors} vectors from ${res.totalChunks} chunks.\n\nWhat would you like to know about it?`,
        },
      ])
      if (fetchDocs) fetchDocs()
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Failed to upload: ${err.message}` }])
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#0b0d14]">
      {/* ── Header ── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-5">
        <div className="flex items-center gap-3">
          {selectedDocName && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 items-center gap-1.5 rounded-lg bg-violet-500/[0.1] px-2.5">
                <svg className="h-3 w-3 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="text-[12px] font-medium text-violet-300">{selectedDocName}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <div className="flex h-8 items-center rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
            <button
              onClick={() => setMode("standard")}
              className={`flex h-7 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium transition-all duration-200
                ${mode === "standard"
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-white/40 hover:text-white/60"
                }`}
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Standard
            </button>
            <button
              onClick={() => setMode("verified")}
              className={`flex h-7 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium transition-all duration-200
                ${mode === "verified"
                  ? "bg-emerald-500/15 text-emerald-400 shadow-sm"
                  : "text-white/40 hover:text-white/60"
                }`}
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              Verified
            </button>
          </div>

          {/* Upload PDF */}
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
            disabled={isUploading || isLoading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isLoading}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[12px] font-medium text-white/55 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {isUploading ? "Uploading..." : "Upload PDF"}
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[820px] flex-col gap-1 px-4 py-6">
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}
          {isLoading && <LoadingDots />}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ── Input ── */}
      <footer className="shrink-0 border-t border-white/[0.06] px-4 py-4">
        <div className="mx-auto max-w-[820px]">
          <form
            onSubmit={handleSubmit}
            className="relative rounded-2xl border border-white/[0.08] bg-[#12141e] transition-all duration-200 focus-within:border-violet-500/30 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.08)]"
          >
            <div className="flex items-end gap-2 p-2.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                placeholder={mode === "verified" ? "Ask a question (verified mode — slower, higher confidence)..." : "Ask a question about your document..."}
                className="min-h-[44px] max-h-36 w-full resize-none bg-transparent px-2.5 py-2 text-[14px] leading-6 text-white outline-none placeholder:text-white/25"
                rows={1}
                disabled={isLoading}
              />

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_4px_12px_rgba(139,92,246,0.3)] transition-all duration-200 hover:shadow-[0_4px_20px_rgba(139,92,246,0.5)] disabled:opacity-30 disabled:shadow-none
                  ${mode === "verified"
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                    : "bg-gradient-to-br from-violet-500 to-indigo-600"
                  }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
                </svg>
              </button>
            </div>
          </form>

          <p className="mt-2.5 text-center text-[11px] text-white/20">
            {mode === "verified"
              ? "Verified mode — answers are checked against source documents for accuracy."
              : "Answers are grounded in your uploaded documents. Always verify critical information."
            }
          </p>
        </div>
      </footer>
    </div>
  )
}