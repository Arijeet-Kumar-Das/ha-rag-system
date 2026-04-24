import React from 'react'

const navItems = [
    {
        label: 'Home',
        action: 'home',
        icon: (
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V20h14V9.5" />
            </svg>
        ),
    },
    {
        label: 'Chat',
        action: 'chat',
        icon: (
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 10h8" />
                <path d="M8 14h5" />
                <path d="M6 19l-3 2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6Z" />
            </svg>
        ),
    },
]

const Sidebar = ({ setMode }) => {
    return (
        <aside className="hidden w-[260px] shrink-0 rounded-2xl border border-white/6 bg-[#11141b] p-4 lg:flex lg:flex-col">
            <div className="flex items-center gap-3 px-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_10px_25px_rgba(124,58,237,0.25)]">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z" />
                    </svg>
                </div>

                <div>
                    <h2 className="text-[18px] font-semibold tracking-tight text-white">HA RAG</h2>
                    <p className="text-sm text-white/45">Smart document assistant</p>
                </div>
            </div>

            <div className="mt-8">
                <div className="flex h-10 items-center gap-3 rounded-xl border border-white/6 bg-white/[0.03] px-3 text-white/45">
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3.5-3.5" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                    />
                </div>
            </div>

            <nav className="mt-6 space-y-2">
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => setMode(item.action)}
                        className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white"
                    >
                        <span className="text-white/55">{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="mt-8">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/25">
                    Workspace
                </p>

                <div className="mt-3 space-y-2">
                    {[
                        'Recent chats',
                        'Uploaded PDFs',
                        'Saved prompts',
                    ].map((item) => (
                        <div
                            key={item}
                            className="rounded-xl border border-white/6 bg-white/[0.025] px-3 py-2.5 text-sm text-white/55"
                        >
                            {item}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-auto rounded-xl border border-white/6 bg-white/[0.025] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/25">
                    Version
                </p>
                <p className="mt-1 text-sm text-white/55">v1.0 HA-RAG</p>
            </div>
        </aside>
    )
}

export default Sidebar