import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import {
  addWorkspaceDocuments,
  askQuestion,
  createWorkspace,
  deleteWorkspace,
  getChatsByDocument,
  getChatsByWorkspace,
  getChatMessages,
  getDocuments,
  getWorkspaces,
  removeWorkspaceDocument,
  uploadFile,
  deleteChat
} from '../api';
import ChatMessage from '../components/ChatMessage';
import LoadingDots from '../components/LoadingDots';
import logo from '../assets/logo.png';

export default function ChatPage() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDark, t } = useTheme();

  const [documents, setDocuments] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(docId || null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [activeDocumentIds, setActiveDocumentIds] = useState(docId ? [docId] : []);
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedDocName, setSelectedDocName] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState('standard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredChat, setHoveredChat] = useState(null);
  const [hoveredWorkspace, setHoveredWorkspace] = useState(null);
  const [showWorkspaceForm, setShowWorkspaceForm] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [newWsDocIds, setNewWsDocIds] = useState([]);
  const [isBusyWorkspace, setIsBusyWorkspace] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const skipReload = useRef(false);

  const selectedWorkspace = workspaces.find(workspace => workspace._id === selectedWorkspaceId) || null;
  const workspaceDocuments = selectedWorkspace?.documents || [];
  const includedDocumentIds = workspaceDocuments.map(doc => doc._id);
  const selectedScopeName = selectedWorkspace?.name || selectedDocName;
  const isWorkspaceMode = Boolean(selectedWorkspaceId);

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

  const fetchWorkspaces = useCallback(async () => {
    try {
      const data = await getWorkspaces();
      setWorkspaces(data);
      return data;
    } catch (err) {
      console.error('Failed to load workspaces', err);
      return [];
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);
  useEffect(() => {
    const doc = documents.find(d => d._id === selectedDocumentId);
    setSelectedDocName(doc?.fileName || '');
  }, [selectedDocumentId, documents]);

  // Sync activeDocumentIds when workspace documents change
  const workspaceDocIdKey = workspaceDocuments.map(d => d._id).sort().join(',');
  useEffect(() => {
    if (!selectedWorkspace) return;

    const wsDocIds = (selectedWorkspace.documents || []).map(d => d._id);
    if (wsDocIds.length === 0) {
      setActiveDocumentIds([]);
      return;
    }

    setActiveDocumentIds(prev => {
      const currentSet = new Set(prev);
      const stillValid = wsDocIds.filter(id => currentSet.has(id));
      return stillValid.length > 0 ? stillValid : wsDocIds;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspaceId, workspaceDocIdKey]);

  const fetchChats = useCallback(async () => {
    try {
      if (selectedWorkspaceId) {
        setChats(await getChatsByWorkspace(selectedWorkspaceId));
        return;
      }

      if (selectedDocumentId) {
        setChats(await getChatsByDocument(selectedDocumentId));
        return;
      }

      setChats([]);
    } catch (err) {
      console.error('Failed to load chats', err);
    }
  }, [selectedDocumentId, selectedWorkspaceId]);

  useEffect(() => {
    setSelectedChatId(null);
    fetchChats();
  }, [selectedDocumentId, selectedWorkspaceId, fetchChats]);

  const getWelcomeMessage = useCallback(() => ({
    role: 'assistant',
    content: selectedWorkspace
      ? `I'm ready to answer questions across **${selectedWorkspace.name}** using ${activeDocumentIds.length} active document${activeDocumentIds.length === 1 ? '' : 's'}.`
      : selectedDocName
      ? `I'm ready to answer questions about **${selectedDocName}**. What would you like to know?`
      : "Hello! I'm your AI academic assistant. Select a document or upload one to get started."
  }), [selectedWorkspace, selectedDocName, activeDocumentIds.length]);

  useEffect(() => {
    if (skipReload.current) { skipReload.current = false; return; }
    if (selectedChatId) {
      setIsLoading(true);
      getChatMessages(selectedChatId)
        .then(h => {
          setMessages(h.map(m => ({ role: m.role, content: m.content, sources: m.sources || [] })));
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setMessages([getWelcomeMessage()]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId]);

  useEffect(() => {
    if (!selectedChatId) setMessages([getWelcomeMessage()]);
  }, [selectedDocumentId, selectedWorkspaceId, activeDocumentIds.length, getWelcomeMessage, selectedChatId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;

    let targetPayload;
    if (selectedWorkspaceId) {
      if (activeDocumentIds.length === 0) {
        setMessages(p => [...p, { role: 'assistant', content: 'Select at least one active workspace document before asking.' }]);
        return;
      }
      targetPayload = { workspaceId: selectedWorkspaceId, documentIds: activeDocumentIds };
    } else {
      let resolvedDocumentId = selectedDocumentId;
      if (!resolvedDocumentId) {
        try { const docs = await getDocuments(); if (docs?.length > 0) resolvedDocumentId = [...docs].sort((a, b) => new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0))[0]._id; } catch (err) { console.error('Failed to resolve latest document', err); }
      }
      if (!resolvedDocumentId) { setMessages(p => [...p, { role: 'assistant', content: 'Please select or upload a document first.' }]); return; }
      targetPayload = resolvedDocumentId;
    }

    const userText = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: userText }]);
    setIsLoading(true);
    setIsStreaming(true);
    let isFirstToken = true;
    let assistantStarted = false;

    try {
      const result = await askQuestion(userText, targetPayload, selectedChatId, (token, src) => {
        if (isFirstToken) {
          setIsLoading(false); isFirstToken = false;
          assistantStarted = true;
          setMessages(p => [...p, { role: 'assistant', content: token, streaming: true, sources: src || [] }]);
        } else {
          setMessages(p => { const n = [...p]; n[n.length - 1] = { ...n[n.length - 1], content: n[n.length - 1].content + token }; return n; });
        }
      }, mode);
      setIsLoading(false);
      setIsStreaming(false);
      setMessages(p => {
        const n = [...p];
        if (!assistantStarted) {
          n.push({
            role: 'assistant',
            content: result?.answer || '',
            streaming: false,
            sources: result?.sources || [],
            verification: result?.verification || null
          });
          return n;
        }

        const lastIdx = n.length - 1;
        n[lastIdx] = {
          ...n[lastIdx],
          streaming: false,
          sources: result?.sources || n[lastIdx].sources,
          verification: result?.verification || null
        };
        return n;
      });
      if (result?.chatId && result.chatId !== selectedChatId) { skipReload.current = true; setSelectedChatId(result.chatId); fetchChats(); }
    } catch (err) {
      setIsLoading(false);
      setIsStreaming(false);
      setMessages(p => {
        const n = [...p];
        const lastIdx = n.length - 1;

        if (assistantStarted && n[lastIdx]?.role === 'assistant') {
          n[lastIdx] = {
            ...n[lastIdx],
            streaming: false,
            content: `${n[lastIdx].content}\n\nError: ${err.message}`
          };
          return n;
        }

        return [...n, { role: 'assistant', content: `Error: ${err.message}` }];
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true);
    setMessages(p => [...p, { role: 'user', content: `📄 Uploading ${file.name}...` }]);
    try {
      const res = await uploadFile(file, selectedWorkspaceId);
      setMessages(p => [...p, { role: 'assistant', content: `Uploaded **${file.name}** — ${res.storedVectors} vectors from ${res.totalChunks} chunks. Ask me anything about it!` }]);
      await fetchDocs();
      const updatedWorkspaces = await fetchWorkspaces();
      if (selectedWorkspaceId && res.mongoDocumentId) {
        setActiveDocumentIds(prev => [...new Set([...prev, res.mongoDocumentId])]);
        const stillSelected = updatedWorkspaces.find(workspace => workspace._id === selectedWorkspaceId);
        if (!stillSelected) setSelectedWorkspaceId(null);
      }
    } catch (err) { setMessages(p => [...p, { role: 'assistant', content: `Failed: ${err.message}` }]); }
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDeleteChat = async (chatId) => {
    try { await deleteChat(chatId); setChats(p => p.filter(c => c._id !== chatId)); if (selectedChatId === chatId) setSelectedChatId(null); } catch (err) { console.error('Failed to delete chat', err); }
  };

  const handleSelectDocument = (docId) => {
    setSelectedWorkspaceId(null);
    setSelectedDocumentId(docId);
    setActiveDocumentIds([docId]);
    navigate(`/chat/${docId}`);
  };

  const handleSelectWorkspace = (workspace) => {
    const docIds = (workspace.documents || []).map(doc => doc._id);
    setSelectedWorkspaceId(workspace._id);
    setSelectedDocumentId(null);
    setSelectedDocName('');
    setActiveDocumentIds(docIds);
    setSelectedChatId(null);
    setMessages([{
      role: 'assistant',
      content: `I'm ready to answer questions across **${workspace.name}** using ${docIds.length} active document${docIds.length === 1 ? '' : 's'}.`
    }]);
    navigate('/chat');
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (isBusyWorkspace) return;
    const name = workspaceName.trim();
    if (!name) return;
    if (newWsDocIds.length === 0) return;
    setIsBusyWorkspace(true);
    try {
      const workspace = await createWorkspace({
        name,
        documentIds: newWsDocIds
      });
      setWorkspaces(prev => {
        if (prev.some(w => w._id === workspace._id)) return prev;
        return [workspace, ...prev];
      });
      setWorkspaceName('');
      setNewWsDocIds([]);
      setShowWorkspaceForm(false);
      handleSelectWorkspace(workspace);
    } catch (err) {
      setMessages(p => [...p, { role: 'assistant', content: `Workspace error: ${err.message}` }]);
    } finally {
      setIsBusyWorkspace(false);
    }
  };

  const handleDeleteWorkspace = async (wsId) => {
    if (isBusyWorkspace) return;
    setIsBusyWorkspace(true);
    try {
      await deleteWorkspace(wsId);
      setWorkspaces(prev => prev.filter(w => w._id !== wsId));
      if (selectedWorkspaceId === wsId) {
        setSelectedWorkspaceId(null);
        setActiveDocumentIds([]);
      }
    } catch (err) {
      console.error('Failed to delete workspace', err);
    } finally {
      setIsBusyWorkspace(false);
    }
  };

  const handleCreateWorkspaceFromDoc = (docId) => {
    const doc = documents.find(d => d._id === docId);
    setWorkspaceName(doc?.fileName?.replace(/\.pdf$/i, '') || '');
    setNewWsDocIds([docId]);
    setShowWorkspaceForm(true);
  };

  const toggleNewWsDoc = (docId) => {
    setNewWsDocIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const openWorkspaceForm = () => {
    setShowWorkspaceForm(prev => {
      if (!prev) {
        setWorkspaceName('');
        setNewWsDocIds(selectedDocumentId ? [selectedDocumentId] : []);
      }
      return !prev;
    });
  };

  const toggleActiveDocument = (docId) => {
    setActiveDocumentIds(prev => {
      if (prev.includes(docId)) {
        return prev.filter(id => id !== docId);
      }
      return [...prev, docId];
    });
  };

  const handleAddDocumentToWorkspace = async (docId) => {
    if (!selectedWorkspaceId || isBusyWorkspace) return;
    setIsBusyWorkspace(true);
    try {
      const workspace = await addWorkspaceDocuments(selectedWorkspaceId, [docId]);
      setWorkspaces(prev => prev.map(item => item._id === workspace._id ? workspace : item));
      setActiveDocumentIds(prev => [...new Set([...prev, docId])]);
    } catch (err) {
      setMessages(p => [...p, { role: 'assistant', content: `Could not add document: ${err.message}` }]);
    } finally {
      setIsBusyWorkspace(false);
    }
  };

  const handleRemoveDocumentFromWorkspace = async (docId) => {
    if (!selectedWorkspaceId || isBusyWorkspace) return;
    setIsBusyWorkspace(true);
    try {
      const workspace = await removeWorkspaceDocument(selectedWorkspaceId, docId);
      setWorkspaces(prev => prev.map(item => item._id === workspace._id ? workspace : item));
      setActiveDocumentIds(prev => prev.filter(id => id !== docId));
    } catch (err) {
      setMessages(p => [...p, { role: 'assistant', content: `Could not remove document: ${err.message}` }]);
    } finally {
      setIsBusyWorkspace(false);
    }
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
            className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-[0.98] ${isDark ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500'}`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
            New Chat
          </button>
        </div>

        <nav className="mt-2 px-3">
          <button onClick={() => navigate('/dashboard')}
            className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-all ${isDark ? 'text-white/50 hover:bg-white/[0.05] hover:text-white/80' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            Dashboard
          </button>
        </nav>

        {/* Scrollable sidebar content */}
        <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
        <div className={`mx-5 mt-4 mb-2 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`} />

        {/* Workspaces */}
        <div className="px-3">
          <div className="mb-2 flex items-center justify-between px-2">
            <div className="flex items-center gap-1.5">
              <svg className={`h-3 w-3 ${isDark ? 'text-emerald-500/50' : 'text-emerald-600/40'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 8h8" /></svg>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${t.textFaint}`}>Workspaces</p>
            </div>
            <button
              onClick={openWorkspaceForm}
              className={`flex h-6 w-6 items-center justify-center rounded-md transition-all ${isDark ? 'text-white/30 hover:bg-white/[0.06] hover:text-violet-300' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600'}`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
            </button>
          </div>

          {showWorkspaceForm && (
            <form onSubmit={handleCreateWorkspace} className={`mb-3 rounded-lg border ${t.border} ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} p-2.5`}>
              <input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Workspace name"
                autoFocus
                className={`mb-2 h-8 w-full rounded-md border ${t.border} ${t.bgInput} px-2 text-[12px] ${t.text} outline-none`}
              />
              <p className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wider ${t.textFaint}`}>Select documents</p>
              <div className="max-h-[140px] space-y-1 overflow-y-auto mb-2.5">
                {documents.length > 0 ? documents.map(doc => (
                  <label
                    key={doc._id}
                    className={`flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-[12px] transition-all ${newWsDocIds.includes(doc._id)
                      ? isDark ? 'bg-violet-500/[0.1] text-violet-200' : 'bg-indigo-50 text-indigo-700'
                      : `${t.textSub} ${t.bgHover}`}`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${newWsDocIds.includes(doc._id)
                      ? isDark ? 'border-violet-400 bg-violet-500 text-white' : 'border-indigo-500 bg-indigo-500 text-white'
                      : isDark ? 'border-white/15' : 'border-slate-300'}`}>
                      {newWsDocIds.includes(doc._id) && (
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 4 4L19 6" /></svg>
                      )}
                    </span>
                    <input type="checkbox" className="hidden" checked={newWsDocIds.includes(doc._id)} onChange={() => toggleNewWsDoc(doc._id)} />
                    <span className="truncate">{doc.fileName}</span>
                  </label>
                )) : (
                  <p className={`py-2 text-center text-[11px] ${t.textMuted}`}>No documents uploaded yet</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowWorkspaceForm(false); setWorkspaceName(''); setNewWsDocIds([]); }}
                  className={`h-8 flex-1 rounded-md border ${t.border} text-[12px] font-medium ${t.textSub} transition-all ${t.bgHover}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusyWorkspace || !workspaceName.trim() || newWsDocIds.length === 0}
                  className={`h-8 flex-1 rounded-md text-[12px] font-medium text-white transition-all disabled:opacity-40 ${isDark ? 'bg-violet-600 hover:bg-violet-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                >
                  {isBusyWorkspace ? 'Creating...' : `Create (${newWsDocIds.length} doc${newWsDocIds.length !== 1 ? 's' : ''})`}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-0.5 max-h-[135px] overflow-y-auto">
            {workspaces.length > 0 ? workspaces.map(workspace => (
              <div
                key={workspace._id}
                className="relative"
                onMouseEnter={() => setHoveredWorkspace(workspace._id)}
                onMouseLeave={() => setHoveredWorkspace(null)}
              >
                <button
                  onClick={() => handleSelectWorkspace(workspace)}
                  className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-3 pr-8 text-[13px] transition-all
                    ${selectedWorkspaceId === workspace._id
                      ? isDark ? 'bg-emerald-500/[0.12] text-emerald-300 font-medium' : 'bg-emerald-50 text-emerald-700 font-medium'
                      : `${t.textSub} ${t.bgHover}`}`}
                >
                  <svg className={`h-3.5 w-3.5 shrink-0 ${selectedWorkspaceId === workspace._id ? 'text-emerald-400' : t.textFaint}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 8h8" /><path d="M8 12h5" />
                  </svg>
                  <span className="min-w-0 flex-1 truncate text-left">{workspace.name}</span>
                </button>
                {(hoveredWorkspace === workspace._id || selectedWorkspaceId === workspace._id) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteWorkspace(workspace._id); }}
                    disabled={isBusyWorkspace}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md transition-all ${isDark ? 'text-white/25 hover:bg-red-500/15 hover:text-red-400' : 'text-slate-300 hover:bg-red-100 hover:text-red-500'}`}
                    title="Delete workspace"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                  </button>
                )}
              </div>
            )) : (
              <div className={`rounded-lg border border-dashed ${t.border} px-3 py-3 text-center text-[12px] ${t.textMuted}`}>No workspaces yet</div>
            )}
          </div>
        </div>

        <div className={`mx-5 mt-4 mb-2 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`} />

        {selectedWorkspace && (
          <div className="px-3">
            <div className="mb-2 flex items-center justify-between px-2">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${t.textFaint}`}>Workspace Docs</p>
              <span className={`text-[10px] font-medium ${isDark ? 'text-emerald-400/60' : 'text-emerald-600/60'}`}>{activeDocumentIds.length} active / {workspaceDocuments.length} total</span>
            </div>

            <div className="space-y-0.5 max-h-[160px] overflow-y-auto">
              {workspaceDocuments.length > 0 ? workspaceDocuments.map(doc => (
                <div
                  key={doc._id}
                  className={`group flex h-9 items-center gap-2 rounded-lg px-2.5 text-[12px] ${activeDocumentIds.includes(doc._id)
                    ? isDark ? 'bg-emerald-500/[0.08] text-emerald-200' : 'bg-emerald-50 text-emerald-700'
                    : `${t.textSub} ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}`}
                >
                  <button
                    onClick={() => toggleActiveDocument(doc._id)}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${activeDocumentIds.includes(doc._id)
                      ? 'border-emerald-400 bg-emerald-500 text-white'
                      : isDark ? 'border-white/15 text-transparent hover:border-white/30' : 'border-slate-300 text-transparent hover:border-slate-400'}`}
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 4 4L19 6" /></svg>
                  </button>
                  <span className="min-w-0 flex-1 truncate">{doc.fileName}</span>
                  <button
                    onClick={() => handleRemoveDocumentFromWorkspace(doc._id)}
                    disabled={isBusyWorkspace}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100 disabled:opacity-30 ${isDark ? 'text-white/25 hover:bg-red-500/15 hover:text-red-400' : 'text-slate-300 hover:bg-red-100 hover:text-red-500'}`}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                </div>
              )) : (
                <div className={`rounded-lg border border-dashed ${t.border} px-3 py-3 text-center text-[12px] ${t.textMuted}`}>Add documents below</div>
              )}
            </div>

            {documents.some(doc => !includedDocumentIds.includes(doc._id)) && (
              <div className="mt-2 max-h-[120px] space-y-0.5 overflow-y-auto">
                {documents.filter(doc => !includedDocumentIds.includes(doc._id)).map(doc => (
                  <button
                    key={doc._id}
                    onClick={() => handleAddDocumentToWorkspace(doc._id)}
                    disabled={isBusyWorkspace}
                    className={`flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-[12px] ${t.textMuted} transition-all ${t.bgHover} disabled:opacity-40`}
                  >
                    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                    <span className="truncate">Add {doc.fileName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedWorkspace && (
          <div className={`mx-5 mt-4 mb-2 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`} />
        )}

        {/* Documents */}
        <div className="px-3">
          <div className="mb-2 flex items-center gap-1.5 px-2">
            <svg className={`h-3 w-3 ${isDark ? 'text-violet-500/50' : 'text-indigo-500/40'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${t.textFaint}`}>Documents</p>
          </div>
          <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
            {documents.length > 0 ? documents.map(doc => (
              <div key={doc._id} className="group relative">
                <button onClick={() => handleSelectDocument(doc._id)}
                  className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-3 pr-8 text-[13px] transition-all truncate
                    ${!selectedWorkspaceId && selectedDocumentId === doc._id
                      ? isDark ? 'bg-violet-500/[0.12] text-violet-300 font-medium' : 'bg-indigo-100 text-indigo-700 font-medium'
                      : `${t.textSub} ${t.bgHover}`}`}
                >
                  <svg className={`h-3.5 w-3.5 shrink-0 ${!selectedWorkspaceId && selectedDocumentId === doc._id ? (isDark ? 'text-violet-400' : 'text-indigo-600') : t.textFaint}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="truncate">{doc.fileName}</span>
                </button>
                {/* Quick-create workspace from this doc */}
                {!selectedWorkspaceId && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCreateWorkspaceFromDoc(doc._id); }}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'text-white/25 hover:bg-emerald-500/15 hover:text-emerald-400' : 'text-slate-300 hover:bg-emerald-100 hover:text-emerald-600'}`}
                    title="Create workspace from this document"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M12 8v6" /><path d="M9 11h6" /></svg>
                  </button>
                )}
              </div>
            )) : <div className={`rounded-lg border border-dashed ${t.border} px-3 py-3 text-center text-[12px] ${t.textMuted}`}>No documents yet</div>}
          </div>
        </div>

        <div className={`mx-5 mt-4 mb-2 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`} />

        {/* Chats */}
        <div className="px-3 pb-2">
          <div className="mb-2 flex items-center justify-between px-2">
            <div className="flex items-center gap-1.5">
              <svg className={`h-3 w-3 ${isDark ? 'text-blue-500/50' : 'text-blue-500/40'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${t.textFaint}`}>Chats</p>
            </div>
            {chats.length > 0 && <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${isDark ? 'bg-white/[0.06] text-white/30' : 'bg-slate-100 text-slate-400'}`}>{chats.length}</span>}
          </div>
          <div className="space-y-0.5 pr-1">
            {chats.length > 0 ? chats.map(chat => (
              <div key={chat._id} onMouseEnter={() => setHoveredChat(chat._id)} onMouseLeave={() => setHoveredChat(null)} className="relative">
                <button onClick={() => { setSelectedChatId(chat._id); if (chat.activeDocumentIds?.length) setActiveDocumentIds(chat.activeDocumentIds); }}
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
        </div>

        {/* Footer */}
        <div className={`shrink-0 border-t ${isDark ? 'border-white/[0.05]' : 'border-slate-200'} px-4 py-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-1.5 w-1.5 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'} shadow-[0_0_6px_rgba(52,211,153,0.5)]`} />
              <span className={`text-[11px] ${t.textFaint}`}>v2.0 — HA-RAG</span>
            </div>
            <button onClick={() => { logout(); navigate('/'); }}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all ${isDark ? 'text-white/30 hover:bg-red-500/10 hover:text-red-400' : 'text-slate-400 hover:bg-red-50 hover:text-red-500'}`}>
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Chat ── */}
      <div className={`flex flex-1 flex-col min-w-0 h-screen ${isDark ? 'bg-[#0b0d14]' : 'bg-[#f8f9fc]'}`}>
        {/* Header */}
        <header className={`flex h-14 shrink-0 items-center justify-between border-b ${t.border} px-5`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.textMuted} transition-all ${t.bgHover}`}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            {selectedScopeName && (
              <div className={`flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 ${isWorkspaceMode ? (isDark ? 'bg-emerald-500/[0.1]' : 'bg-emerald-50') : (isDark ? 'bg-violet-500/[0.1]' : 'bg-indigo-100')}`}>
                <svg className={`h-3 w-3 ${isWorkspaceMode ? 'text-emerald-400' : (isDark ? 'text-violet-400' : 'text-indigo-600')}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isWorkspaceMode ? (
                    <>
                      <rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 8h8" /><path d="M8 12h5" />
                    </>
                  ) : (
                    <>
                      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
                    </>
                  )}
                </svg>
                <span className={`text-[12px] font-medium ${isWorkspaceMode ? 'text-emerald-400' : (isDark ? 'text-violet-300' : 'text-indigo-700')} truncate max-w-[100px] sm:max-w-[200px]`}>{selectedScopeName}</span>
                {isWorkspaceMode && <span className={`text-[10px] ${isDark ? 'text-emerald-300/50' : 'text-emerald-600/60'}`}>{activeDocumentIds.length} active</span>}
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
            <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} disabled={isUploading || isLoading || isStreaming} />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading || isLoading || isStreaming}
              className={`flex h-8 items-center gap-1.5 rounded-lg border ${t.border} px-2 sm:px-3 text-[12px] font-medium ${t.textSub} transition-all ${t.borderHover} ${t.bgHover} disabled:opacity-40`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Upload'}</span>
            </button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[820px] px-4 py-6">
            <div className="flex flex-col gap-1">
              {messages.map((msg, idx) => <ChatMessage key={idx} message={msg} />)}
              {isLoading && <LoadingDots />}
              <div ref={messagesEndRef} />
            </div>
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
                  placeholder={isWorkspaceMode ? 'Ask across active workspace documents...' : (mode === 'verified' ? 'Ask (verified mode — slower, higher confidence)...' : 'Ask a question about your document...')}
                  className={`min-h-[44px] max-h-36 w-full resize-none bg-transparent px-2.5 py-2 text-[14px] leading-6 ${t.text} outline-none ${isDark ? 'placeholder:text-white/25' : 'placeholder:text-slate-400'}`}
                  rows={1} disabled={isLoading || isStreaming}
                />
                <button type="submit" disabled={!input.trim() || isLoading || isStreaming}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-md transition-all hover:shadow-lg disabled:opacity-30 disabled:shadow-none
                    ${mode === 'verified' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : `bg-gradient-to-br ${t.gradient}`}`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
                </button>
              </div>
            </form>
            <p className={`mt-2 text-center text-[11px] ${t.textFaint}`}>
              {isWorkspaceMode
                ? `Using ${activeDocumentIds.length} active workspace document${activeDocumentIds.length === 1 ? '' : 's'}.`
                : mode === 'verified' ? 'Verified mode — answers are cross-checked against sources.' : 'Answers are grounded in your documents.'}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
