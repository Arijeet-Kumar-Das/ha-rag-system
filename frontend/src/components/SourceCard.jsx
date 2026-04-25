import { useState } from "react"

export default function SourceCard({ sources }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!sources || sources.length === 0) return null

  return (
    <div className="w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/50 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06] hover:text-white/80"
      >
        <svg
          className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <svg className="h-3 w-3 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        Sources ({sources.length})
      </button>

      {isExpanded && (
        <div className="mt-2 flex gap-2.5 overflow-x-auto pb-2">
          {sources.map((source, idx) => (
            <div
              key={idx}
              className="min-w-[230px] max-w-[260px] shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5 transition-all duration-200 hover:border-violet-500/20 hover:bg-white/[0.04]"
            >
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <svg className="h-3 w-3 shrink-0 text-violet-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="truncate text-[11px] font-medium text-violet-300/80">
                    {source.fileName || "Unknown"}
                  </span>
                </div>

                <span className="shrink-0 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-white/35">
                  #{source.chunkIndex ?? "?"}
                </span>
              </div>

              <p className="text-[11px] leading-5 text-white/40">
                {source.text
                  ? `"${source.text.slice(0, 120)}${source.text.length > 120 ? "..." : ""}"`
                  : "No preview available."}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}