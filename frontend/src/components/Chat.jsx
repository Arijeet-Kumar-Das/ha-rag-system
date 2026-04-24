import { useState, useRef, useEffect } from "react"
import ChatMessage from "./ChatMessage"
import LoadingDots from "./LoadingDots"
import { askQuestion, uploadFile } from "../api"

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I am your AI academic assistant. You can ask me questions or upload a document to get started.",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userText = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userText }])
    setIsLoading(true)

    let isFirstToken = true

    try {
      const result = await askQuestion(userText, (token, currentSources) => {
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
      })

      setMessages((prev) => {
        const newMsgs = [...prev]
        const lastIdx = newMsgs.length - 1
        newMsgs[lastIdx] = {
          ...newMsgs[lastIdx],
          streaming: false,
          sources: result?.sources || newMsgs[lastIdx].sources,
        }
        return newMsgs
      })
    } catch (err) {
      setIsLoading(false)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ Error: ${err.message}` },
      ])
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `📄 Uploading ${file.name}...` },
    ])

    try {
      const res = await uploadFile(file)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ Successfully uploaded and processed **${file.name}**.\nStored ${res.storedVectors} vectors from ${res.totalChunks} chunks.\nWhat would you like to know about it?`,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ Failed to upload: ${err.message}` },
      ])
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#0f1117]">
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/6 px-6">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-white">HA RAG Chat</h1>
          <p className="mt-1 text-sm text-white/40">Ask questions based on uploaded documents</p>
        </div>

        <div>
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
            className="rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload PDF"}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5">
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}
          {isLoading && <LoadingDots />}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t border-white/6 px-6 py-4">
        <div className="mx-auto max-w-[900px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/8 bg-[#151922] p-2"
          >
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                placeholder="Ask a question..."
                className="min-h-[56px] max-h-48 w-full resize-none bg-transparent px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/35"
                rows={1}
                disabled={isLoading}
              />

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-white/90 disabled:bg-white/20 disabled:text-white/30"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
              </button>
            </div>
          </form>

          <p className="mt-3 text-center text-xs text-white/35">
            AI can make mistakes. Verify important information from uploaded documents.
          </p>
        </div>
      </footer>
    </div>
  )
}