import { useState } from 'react'

const Sidebar = ({
  mode, setMode, startChat,
  documents, selectedDocumentId, setSelectedDocumentId,
  chats, selectedChatId, setSelectedChatId,
  onNewChat, onDeleteChat
}) => {
  const [hoveredChat, setHoveredChat] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (e, chatId) => {
    e.stopPropagation()
    setDeletingId(chatId)
    await onDeleteChat(chatId)
    setDeletingId(null)
  }

  return (
    <aside className="flex h-screen w-[280px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0c0e16]">

      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_4px_20px_rgba(139,92,246,0.3)]">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z" />
          </svg>
        </div>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-white">HA RAG</h2>
          <p className="text-[11px] text-white/35">Document Assistant</p>
        </div>
      </div>

      {/* ── New Chat button ── */}
      <div className="px-3 pt-4 pb-1">
        <button
          onClick={onNewChat}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[13px] font-medium text-white/70 transition-all duration-200 hover:border-violet-500/30 hover:bg-violet-500/[0.08] hover:text-white"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14" /><path d="M5 12h14" />
          </svg>
          New Chat
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="mt-2 space-y-0.5 px-3">
        <button
          onClick={() => setMode('home')}
          className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-all duration-150
            ${mode === 'home' ? 'bg-white/[0.07] text-white' : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Home
        </button>
        <button
          onClick={() => setMode('chat')}
          className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-all duration-150
            ${mode === 'chat' ? 'bg-white/[0.07] text-white' : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          Chat
        </button>
      </nav>

      {/* ── Divider ── */}
      <div className="mx-5 mt-4 mb-2 h-px bg-white/[0.06]" />

      {/* ── Documents ── */}
      <div className="px-3">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
          Documents
        </p>
        <div className="space-y-0.5">
          {documents && documents.length > 0 ? (
            documents.map((doc) => (
              <button
                key={doc._id}
                onClick={() => setSelectedDocumentId(doc._id)}
                className={`group flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] transition-all duration-150 truncate
                  ${selectedDocumentId === doc._id
                    ? 'bg-violet-500/[0.12] text-violet-300 font-medium'
                    : 'text-white/50 hover:bg-white/[0.04] hover:text-white/75'
                  }`}
              >
                <svg className={`h-3.5 w-3.5 shrink-0 ${selectedDocumentId === doc._id ? 'text-violet-400' : 'text-white/25'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="truncate">{doc.fileName}</span>
              </button>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-white/[0.08] px-3 py-3 text-center text-[12px] text-white/25">
              No documents yet
            </div>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-5 mt-4 mb-2 h-px bg-white/[0.06]" />

      {/* ── Chat History ── */}
      <div className="flex min-h-0 flex-1 flex-col px-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
            Chats
          </p>
          {chats && chats.length > 0 && (
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-white/30">
              {chats.length}
            </span>
          )}
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto pr-1">
          {selectedDocumentId ? (
            chats && chats.length > 0 ? (
              chats.map((chat) => (
                <div
                  key={chat._id}
                  onMouseEnter={() => setHoveredChat(chat._id)}
                  onMouseLeave={() => setHoveredChat(null)}
                  className="relative"
                >
                  <button
                    onClick={() => setSelectedChatId(chat._id)}
                    className={`flex h-9 w-full items-center gap-2 rounded-lg px-3 text-[13px] text-left transition-all duration-150 pr-8
                      ${selectedChatId === chat._id
                        ? 'bg-white/[0.08] text-white font-medium'
                        : 'text-white/50 hover:bg-white/[0.04] hover:text-white/75'
                      }
                      ${deletingId === chat._id ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <svg className="h-3.5 w-3.5 shrink-0 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                    <span className="truncate">{chat.title}</span>
                  </button>

                  {/* Delete button — visible on hover */}
                  {(hoveredChat === chat._id || selectedChatId === chat._id) && deletingId !== chat._id && (
                    <button
                      onClick={(e) => handleDelete(e, chat._id)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-white/25 transition-all duration-150 hover:bg-red-500/15 hover:text-red-400"
                      title="Delete chat"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <svg className="h-8 w-8 text-white/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                <p className="text-[12px] text-white/25">No chats yet</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <svg className="h-8 w-8 text-white/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-[12px] text-white/25">Select a document</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-white/[0.05] px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
          <span className="text-[11px] text-white/30">v1.0 HA-RAG</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar