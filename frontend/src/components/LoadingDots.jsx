export default function LoadingDots() {
  return (
    <div className="flex w-full gap-3 py-3">
      {/* Avatar */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-400">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z" />
        </svg>
      </div>

      <div className="flex flex-col items-start">
        <span className="mb-1 text-[10px] font-medium uppercase tracking-wider text-violet-400/60">
          Assistant
        </span>
        <div className="rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.03] px-5 py-3.5">
          <div className="flex items-center gap-1.5">
            <span className="block h-2 w-2 animate-pulse rounded-full bg-violet-400" />
            <span className="block h-2 w-2 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: '0.15s' }} />
            <span className="block h-2 w-2 animate-pulse rounded-full bg-cyan-400" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </div>
    </div>
  )
}