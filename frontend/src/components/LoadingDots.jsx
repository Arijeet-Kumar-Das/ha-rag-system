export default function LoadingDots() {
  return (
    <div className="animate-fade-in flex w-full items-end gap-3">
      <div className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-violet-300 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
        <svg
          className="h-4 w-4"
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

      <div className="rounded-[1.4rem] rounded-bl-md border border-white/10 bg-white/[0.05] px-5 py-4 shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
        <div className="dot-pulse flex items-center gap-1.5">
          <span className="block h-2.5 w-2.5 rounded-full bg-violet-300" />
          <span className="block h-2.5 w-2.5 rounded-full bg-violet-300" />
          <span className="block h-2.5 w-2.5 rounded-full bg-cyan-300" />
        </div>
      </div>
    </div>
  )
}