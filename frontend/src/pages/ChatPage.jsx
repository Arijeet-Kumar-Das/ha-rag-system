import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import { askQuestion, uploadFile, getDocuments, getChatsByDocument, getChatMessages, deleteChat } from '../api';
import ChatMessage from '../components/ChatMessage';
import LoadingDots from '../components/LoadingDots';
import logo from '../assets/logo.png';

export default function ChatPage() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, t } = useTheme();

  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(docId || null);
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedDocName, setSelectedDocName] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState('standard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredChat, setHoveredChat] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const skipReload = useRef(false);

  const fetchDocs = useCallback(async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
      if (docId) {
        const found = docs.find(d => d._id === docId);
        if (found) setSelectedDocName(found.fileName);
      }
    } catch (err) { console.error('Failed to load documents', err); }
  }, [docId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  useEffect(() => {
    const doc = documents.find(d => d._id === selectedDocumentId);
    setSelectedDocName(doc?.fileName || '');
  }, [selectedDocumentId, documents]);

  const fetchChats = useCallback(async () => {
    if (!selectedDocumentId) { setChats([]); return; }
    try { setChats(await getChatsByDocument(selectedDocumentId)); } catch {}
  }, [selectedDocumentId]);

  useEffect(() => { fetchChats(); setSelectedChatId(null); }, [selectedDocumentId, fetchChats]);

  const welcomeMessage = {
    role: 'assistant',
    content: selectedDocName
      ? `I'm ready to answer questions about **${selectedDocName}**. What would you like to know?`
      : "Hello! I'm your AI academic assistant. Select a document or upload one to get started."
  };

  useEffect(() => {
    if (skipReload.current) { skipReload.current = false; return; }
    if (selectedChatId) {
      setIsLoading(true);
      getChatMessages(selectedChatId).then(h => {
        setMessages(h.map(m => ({ role: m.role, content: m.content, sources: m.sources || [] })));
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    } else { setMessages([welcomeMessage]); }
  }, [selectedChatId]);

  useEffect(() => { if (!selectedChatId) setMessages([welcomeMessage]); }, [selectedDocumentId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    let resolvedDocumentId = selectedDocumentId;
    if (!resolvedDocumentId) {
      try { const docs = await getDocuments(); if (docs?.length > 0) resolvedDocumentId = [...docs].sort((a, b) => new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0))[0]._id; } catch {}
    }
    if (!resolvedDocumentId) { setMessages(p => [...p, { role: 'assistant', content: 'Please select or upload a document first.' }]); return; }

    const userText = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: userText }]);
    setIsLoading(true);
    let isFirstToken = true;

    try {
      const result = await askQuestion(userText, resolvedDocumentId, selectedChatId, (token, src) => {
        if (isFirstToken) {
          setIsLoading(false); isFirstToken = false;
          setMessages(p => [...p, { role: 'assistant', content: token, streaming: true, sources: src || [] }]);
        } else {
          setMessages(p => { const n = [...p]; n[n.length - 1] = { ...n[n.length - 1], content: n[n.length - 1].content + token }; return n; });
        }
      }, mode);
      setMessages(p => { const n = [...p]; n[n.length - 1] = { ...n[n.length - 1], streaming: false, sources: result?.sources || n[n.length - 1].sources, verification: result?.verification || null }; return n; });
      if (result?.chatId && result.chatId !== selectedChatId) { skipReload.current = true; setSelectedChatId(result.chatId); fetchChats(); }
    } catch (err) {
      setIsLoading(false);
      setMessages(p => [...p, { role: 'assistant', content: `Error: ${err.message}` }]);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true);
    setMessages(p => [...p, { role: 'user', content: `📄 Uploading ${file.name}...` }]);
    try {
      const res = await uploadFile(file);
      setMessages(p => [...p, { role: 'assistant', content: `Uploaded **${file.name}** — ${res.storedVectors} vectors from ${res.totalChunks} chunks. Ask me anything about it!` }]);
      fetchDocs();
    } catch (err) { setMessages(p => [...p, { role: 'assistant', content: `Failed: ${err.message}` }]); }
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDeleteChat = async (chatId) => {
    try { await deleteChat(chatId); setChats(p => p.filter(c => c._id !== chatId)); if (selectedChatId === chatId) setSelectedChatId(null); } catch {}
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${t.bg}`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`absolute z-40 sm:relative flex h-screen shrink-0 flex-col border-r ${t.border} ${t.bgSub} transition-all duration-300 ${sidebarOpen ? 'w-[270px] translate-x-0' : 'w-[270px] -translate-x-full sm:w-0 sm:translate-x-0 overflow-hidden sm:border-r-0'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-2">
          <img src={logo} alt="HA-RAG" className="h-9 w-9 object-contain" />
          <div>
            <h2 className={`text-sm font-semibold ${t.text}`}>HA-RAG</h2>
            <p className={`text-[10px] ${t.textMuted}`}>Document Assistant</p>
          </div>
        </div>

        {/* New Chat */}
        <div className="px-3 pt-4 pb-1">
          <button onClick={() => setSelectedChatId(null)}
            className={`flex h-9 w-full items-center justify-center gap-2 rounded-lg border ${t.border} text-[13px] font-medium ${t.textSub} transition-all ${isDark ? 'hover:border-violet-500/30 hover:bg-violet-500/[0.08] hover:text-white' : 'hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'}`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
            New Chat
          </button>
        </div>

        <nav className="mt-2 px-3">
          <button onClick={() => navigate('/dashboard')}
            className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium ${t.textSub} transition-all ${t.bgHover}`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            Dashboard
          </button>
        </nav>

        <div className={`mx-5 mt-4 mb-2 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`} />

        {/* Documents */}
        <div className="px-3">
          <p className={`mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${t.textFaint}`}>Documents</p>
          <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
            {documents.length > 0 ? documents.map(doc => (
              <button key={doc._id} onClick={() => { setSelectedDocumentId(doc._id); navigate(`/chat/${doc._id}`); }}
                className={`group flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] transition-all truncate
                  ${selectedDocumentId === doc._id
                    ? isDark ? 'bg-violet-500/[0.12] text-violet-300 font-medium' : 'bg-indigo-100 text-indigo-700 font-medium'
                    : `${t.textSub} ${t.bgHover}`}`}
              >
                <svg className={`h-3.5 w-3.5 shrink-0 ${selectedDocumentId === doc._id ? (isDark ? 'text-violet-400' : 'text-indigo-600') : t.textFaint}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="truncate">{doc.fileName}</span>
              </button>
            )) : <div className={`rounded-lg border border-dashed ${t.border} px-3 py-3 text-center text-[12px] ${t.textMuted}`}>No documents yet</div>}
          </div>
        </div>

        <div className={`mx-5 mt-4 mb-2 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`} />

        {/* Chats */}
        <div className="flex min-h-0 flex-1 flex-col px-3">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${t.textFaint}`}>Chats</p>
            {chats.length > 0 && <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${isDark ? 'bg-white/[0.06] text-white/30' : 'bg-slate-100 text-slate-400'}`}>{chats.length}</span>}
          </div>
          <div className="flex-1 space-y-0.5 overflow-y-auto pr-1">
            {chats.length > 0 ? chats.map(chat => (
              <div key={chat._id} onMouseEnter={() => setHoveredChat(chat._id)} onMouseLeave={() => setHoveredChat(null)} className="relative">
                <button onClick={() => setSelectedChatId(chat._id)}
                  className={`flex h-9 w-full items-center gap-2 rounded-lg px-3 text-[13px] text-left transition-all pr-8
                    ${selectedChatId === chat._id ? `${t.bgActive} ${t.text} font-medium` : `${t.textSub} ${t.bgHover}`}`}
                >
                  <svg className={`h-3.5 w-3.5 shrink-0 ${t.textFaint}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                  <span className="truncate">{chat.title}</span>
                </button>
                {(hoveredChat === chat._id || selectedChatId === chat._id) && (
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat._id); }}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md transition-all ${isDark ? 'text-white/25 hover:bg-red-500/15 hover:text-red-400' : 'text-slate-300 hover:bg-red-100 hover:text-red-500'}`}>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                  </button>
                )}
              </div>
            )) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <svg className={`h-8 w-8 ${t.textFaint}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                <p className={`text-[12px] ${t.textMuted}`}>No chats yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`shrink-0 border-t ${isDark ? 'border-white/[0.05]' : 'border-slate-200'} px-4 py-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
              <span className={`text-[11px] ${t.textFaint}`}>v2.0</span>
            </div>
            <button onClick={() => { logout(); navigate('/'); }}
              className={`text-[12px] font-medium transition-colors ${isDark ? 'text-white/30 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Chat ── */}
      <div className={`flex flex-1 flex-col min-w-0 ${isDark ? 'bg-[#0b0d14]' : 'bg-[#f8f9fc]'}`}>
        {/* Header */}
        <header className={`flex h-14 shrink-0 items-center justify-between border-b ${t.border} px-5`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.textMuted} transition-all ${t.bgHover}`}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            {selectedDocName && (
              <div className={`flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 ${isDark ? 'bg-violet-500/[0.1]' : 'bg-indigo-100'}`}>
                <svg className={`h-3 w-3 ${isDark ? 'text-violet-400' : 'text-indigo-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                <span className={`text-[12px] font-medium ${isDark ? 'text-violet-300' : 'text-indigo-700'} truncate max-w-[100px] sm:max-w-[200px]`}>{selectedDocName}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            {/* Mode Toggle */}
            <div className={`flex h-8 items-center rounded-lg border ${t.border} ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} p-0.5`}>
              <button onClick={() => setMode('standard')}
                className={`flex h-7 items-center gap-1.5 rounded-md px-2 sm:px-3 text-[11px] font-medium transition-all
                  ${mode === 'standard' ? (isDark ? 'bg-white/[0.1] text-white' : 'bg-white text-slate-900 shadow-sm') : `${t.textMuted} ${isDark ? 'hover:text-white/60' : 'hover:text-slate-600'}`}`}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                <span className="hidden sm:inline">Standard</span>
              </button>
              <button onClick={() => setMode('verified')}
                className={`flex h-7 items-center gap-1.5 rounded-md px-2 sm:px-3 text-[11px] font-medium transition-all
                  ${mode === 'verified' ? 'bg-emerald-500/15 text-emerald-500 shadow-sm' : `${t.textMuted} ${isDark ? 'hover:text-white/60' : 'hover:text-slate-600'}`}`}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
                <span className="hidden sm:inline">Verified</span>
              </button>
            </div>

            {/* Upload */}
            <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} disabled={isUploading || isLoading} />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading || isLoading}
              className={`flex h-8 items-center gap-1.5 rounded-lg border ${t.border} px-2 sm:px-3 text-[12px] font-medium ${t.textSub} transition-all ${t.borderHover} ${t.bgHover} disabled:opacity-40`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Upload'}</span>
            </button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[820px] flex-col gap-1 px-4 py-6">
            {messages.map((msg, idx) => <ChatMessage key={idx} message={msg} />)}
            {isLoading && <LoadingDots />}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input */}
        <footer className={`shrink-0 border-t ${t.border} px-4 py-4`}>
          <div className="mx-auto max-w-[820px]">
            <form onSubmit={handleSubmit}
              className={`relative rounded-xl border ${t.border} ${t.bgInput} transition-all focus-within:${t.borderActive} ${isDark ? 'focus-within:shadow-[0_0_20px_rgba(139,92,246,0.06)]' : 'focus-within:shadow-[0_0_20px_rgba(79,70,229,0.06)]'}`}
            >
              <div className="flex items-end gap-2 p-2.5">
                <textarea value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                  placeholder={mode === 'verified' ? 'Ask (verified mode — slower, higher confidence)...' : 'Ask a question about your document...'}
                  className={`min-h-[44px] max-h-36 w-full resize-none bg-transparent px-2.5 py-2 text-[14px] leading-6 ${t.text} outline-none ${isDark ? 'placeholder:text-white/25' : 'placeholder:text-slate-400'}`}
                  rows={1} disabled={isLoading}
                />
                <button type="submit" disabled={!input.trim() || isLoading}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-md transition-all hover:shadow-lg disabled:opacity-30 disabled:shadow-none
                    ${mode === 'verified' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : `bg-gradient-to-br ${t.gradient}`}`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
                </button>
              </div>
            </form>
            <p className={`mt-2 text-center text-[11px] ${t.textFaint}`}>
              {mode === 'verified' ? 'Verified mode — answers are cross-checked against sources.' : 'Answers are grounded in your documents.'}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
