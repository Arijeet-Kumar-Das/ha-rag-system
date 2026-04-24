import { useState } from "react"

export default function SourceCard({ sources }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!sources || sources.length === 0) return null

  return (
    <div className="w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/60 backdrop-blur-xl transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
      >
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Sources ({sources.length})
      </button>

      {isExpanded && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {sources.map((source, idx) => (
            <div
              key={idx}
              className="min-w-[250px] max-w-[290px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white/[0.07]"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="line-clamp-1 text-xs font-semibold text-violet-300">
                  {source.fileName || "Unknown Document"}
                </span>

                <span className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-medium text-white/55">
                  Chunk {source.chunkIndex ?? "?"}
                </span>
              </div>

              <p className="text-xs leading-6 text-white/60">
                {source.text
                  ? `"${source.text.slice(0, 150)}${source.text.length > 150 ? "..." : ""}"`
                  : "No preview available."}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}