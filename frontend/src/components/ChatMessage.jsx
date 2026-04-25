import SourceCard from "./SourceCard"

function VerificationBadge({ verification }) {
  if (!verification) return null

  const { isValid, confidence } = verification

  if (isValid && confidence >= 0.7) {
    return (
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20">
        <svg className="h-3 w-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span className="text-[11px] font-medium text-emerald-400">
          Verified Answer
        </span>
        <span className="text-[10px] text-emerald-400/50">
          {Math.round(confidence * 100)}%
        </span>
      </div>
    )
  }

  if (isValid && confidence >= 0.4) {
    return (
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 border border-amber-500/20">
        <svg className="h-3 w-3 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span className="text-[11px] font-medium text-amber-400">
          Partially Supported
        </span>
        <span className="text-[10px] text-amber-400/50">
          {Math.round(confidence * 100)}%
        </span>
      </div>
    )
  }

  // Low confidence or invalid
  return (
    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1 border border-red-500/20">
      <svg className="h-3 w-3 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <span className="text-[11px] font-medium text-red-400">
        Answer may not be fully supported
      </span>
      <span className="text-[10px] text-red-400/50">
        {Math.round(confidence * 100)}%
      </span>
    </div>
  )
}

export default function ChatMessage({ message }) {
  const isUser = message.role === "user"

  return (
    <div className={`flex w-full gap-3 py-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-400">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z" />
          </svg>
        </div>
      )}

      <div className={`flex max-w-[80%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        {/* Role label */}
        <span className={`mb-1 text-[10px] font-medium uppercase tracking-wider ${isUser ? 'text-white/25' : 'text-violet-400/60'}`}>
          {isUser ? 'You' : 'Assistant'}
        </span>

        {/* Message bubble */}
        <div
          className={`relative rounded-2xl px-4 py-3 text-[14px] leading-7 whitespace-pre-wrap transition-all duration-200
            ${isUser
              ? "rounded-br-md bg-gradient-to-br from-violet-600/90 to-indigo-600/90 text-white shadow-[0_4px_20px_rgba(139,92,246,0.2)]"
              : "rounded-bl-md border border-white/[0.06] bg-white/[0.03] text-white/85"
            }`}
        >
          {message.content || ""}
        </div>

        {/* Verification badge */}
        {!isUser && !message.streaming && message.verification && (
          <VerificationBadge verification={message.verification} />
        )}

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && !message.streaming && (
          <div className="mt-2 w-full">
            <SourceCard sources={message.sources} />
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/40">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 10-16 0" />
          </svg>
        </div>
      )}
    </div>
  )
}