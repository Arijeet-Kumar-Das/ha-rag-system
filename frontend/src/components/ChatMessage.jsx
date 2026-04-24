import SourceCard from "./SourceCard"

export default function ChatMessage({ message }) {
  const isUser = message.role === "user"

  return (
    <div
      className={`animate-fade-in flex w-full items-end gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-violet-300 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
          <svg
            className="h-4.5 w-4.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4Z" />
            <path d="M18 14c2 1 3 3 3 5v2H3v-2c0-2 1-4 3-5" />
            <circle cx="12" cy="6" r="1" fill="currentColor" />
          </svg>
        </div>
      )}

      <div className={`flex max-w-[88%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`relative rounded-2xl px-4 py-3 text-sm leading-7 whitespace-pre-wrap shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition-all duration-200 ${isUser
              ? "rounded-br-md border border-violet-400/20 bg-gradient-to-br from-violet-500 to-cyan-400 text-white"
              : "rounded-bl-md border border-white/10 bg-white/[0.05] text-white/88"
            }`}
        >
          <span className={message.streaming ? "cursor-blink" : ""}>
            {message.content || ""}
          </span>
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3 w-full">
            <SourceCard sources={message.sources} />
          </div>
        )}
      </div>

      {isUser && (
        <div className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/60 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M20 21a8 8 0 1 0-16 0" />
          </svg>
        </div>
      )}
    </div>
  )
}