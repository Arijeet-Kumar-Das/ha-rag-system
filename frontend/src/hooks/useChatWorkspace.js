import { useState, useEffect, useRef, useCallback } from 'react';
import {
  addWorkspaceDocuments,
  askQuestion,
  createWorkspace,
  deleteWorkspace,
  deleteChat,
  getChatsByDocument,
  getChatsByWorkspace,
  getChatMessages,
  getDocuments,
  getWorkspaces,
  removeWorkspaceDocument,
  uploadFile,
} from '../api';

export default function useChatWorkspace(docId, navigate) {
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
  const [isBusyWorkspace, setIsBusyWorkspace] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const skipReload = useRef(false);
  const streamingContentRef = useRef('');
  const streamBatchCount = useRef(0);
  const STREAM_RENDER_INTERVAL = 3; // Render to DOM every N batches

  const selectedWorkspace = workspaces.find(ws => ws._id === selectedWorkspaceId) || null;
  const workspaceDocuments = selectedWorkspace?.documents || [];
  const includedDocumentIds = workspaceDocuments.map(doc => doc._id);
  const selectedScopeName = selectedWorkspace?.name || selectedDocName;
  const isWorkspaceMode = Boolean(selectedWorkspaceId);

  // ── Fetchers ──
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
    } catch (err) { console.error('Failed to load chats', err); }
  }, [selectedDocumentId, selectedWorkspaceId]);

  // ── Effects ──
  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);
  useEffect(() => {
    const doc = documents.find(d => d._id === selectedDocumentId);
    setSelectedDocName(doc?.fileName || '');
  }, [selectedDocumentId, documents]);

  const workspaceDocIdKey = workspaceDocuments.map(d => d._id).sort().join(',');
  useEffect(() => {
    if (!selectedWorkspace) return;
    const wsDocIds = (selectedWorkspace.documents || []).map(d => d._id);
    if (wsDocIds.length === 0) { setActiveDocumentIds([]); return; }
    setActiveDocumentIds(prev => {
      const currentSet = new Set(prev);
      const stillValid = wsDocIds.filter(id => currentSet.has(id));
      return stillValid.length > 0 ? stillValid : wsDocIds;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspaceId, workspaceDocIdKey]);

  useEffect(() => {
    setSelectedChatId(null);
    fetchChats();
  }, [selectedDocumentId, selectedWorkspaceId, fetchChats]);

  const getWelcomeMessage = useCallback(() => ({
    role: 'assistant',
    content: selectedWorkspace
      ? `Ready to assist across **${selectedWorkspace.name}** using ${activeDocumentIds.length} document${activeDocumentIds.length === 1 ? '' : 's'}.`
      : selectedDocName
      ? `Ready to assist with **${selectedDocName}**. What would you like to explore?`
      : "Welcome. Select a document or upload one to begin your research."
  }), [selectedWorkspace, selectedDocName, activeDocumentIds.length]);

  useEffect(() => {
    if (skipReload.current) { skipReload.current = false; return; }
    if (selectedChatId) {
      setIsLoading(true);
      getChatMessages(selectedChatId)
        .then(h => setMessages(h.map(m => ({ role: m.role, content: m.content, sources: m.sources || [] }))))
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

  // Scroll to bottom — use instant during streaming, smooth otherwise
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'instant' : 'smooth' });
  };

  useEffect(() => {
    if (!isStreaming) scrollToBottom();
  }, [messages.length, isLoading]);

  // ── Handlers ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;

    let targetPayload;
    if (selectedWorkspaceId) {
      if (activeDocumentIds.length === 0) {
        setMessages(p => [...p, { role: 'assistant', content: 'Select at least one active document before asking.' }]);
        return;
      }
      targetPayload = { workspaceId: selectedWorkspaceId, documentIds: activeDocumentIds };
    } else {
      let resolvedDocumentId = selectedDocumentId;
      if (!resolvedDocumentId && documents.length > 0) {
        // Use already-fetched documents instead of re-calling API
        resolvedDocumentId = [...documents].sort((a, b) => new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0))[0]._id;
      }
      if (!resolvedDocumentId) {
        setMessages(p => [...p, { role: 'assistant', content: 'Please select or upload a document first.' }]);
        return;
      }
      targetPayload = resolvedDocumentId;
    }

    const userText = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: userText }]);
    setIsLoading(true);
    setIsStreaming(true);
    
    // Reset streaming refs
    streamingContentRef.current = '';
    streamBatchCount.current = 0;
    let isFirstToken = true;
    let assistantStarted = false;

    try {
      const result = await askQuestion(userText, targetPayload, selectedChatId, (token, src) => {
        streamingContentRef.current += token;
        streamBatchCount.current++;
        
        if (isFirstToken) {
          setIsLoading(false);
          isFirstToken = false;
          assistantStarted = true;
          setMessages(p => [...p, { role: 'assistant', content: streamingContentRef.current, streaming: true, sources: src || [] }]);
        } else if (streamBatchCount.current % STREAM_RENDER_INTERVAL === 0) {
          // Only update React state every N batches to reduce re-renders
          const currentContent = streamingContentRef.current;
          setMessages(p => {
            const n = [...p];
            n[n.length - 1] = { ...n[n.length - 1], content: currentContent };
            return n;
          });
        }
        
        // Fast scroll without animation during streaming
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }, mode);

      setIsLoading(false);
      setIsStreaming(false);
      setMessages(p => {
        const n = [...p];
        if (!assistantStarted) {
          n.push({ role: 'assistant', content: result?.answer || '', streaming: false, sources: result?.sources || [], verification: result?.verification || null });
          return n;
        }
        const lastIdx = n.length - 1;
        // Use the full answer from the result to ensure nothing is missed
        n[lastIdx] = { 
          ...n[lastIdx], 
          content: result?.answer || streamingContentRef.current,
          streaming: false, 
          sources: result?.sources || n[lastIdx].sources, 
          verification: result?.verification || null 
        };
        return n;
      });
      if (result?.chatId && result.chatId !== selectedChatId) {
        skipReload.current = true;
        setSelectedChatId(result.chatId);
        fetchChats();
      }
    } catch (err) {
      setIsLoading(false);
      setIsStreaming(false);
      setMessages(p => {
        const n = [...p];
        const lastIdx = n.length - 1;
        if (assistantStarted && n[lastIdx]?.role === 'assistant') {
          n[lastIdx] = { ...n[lastIdx], streaming: false, content: `${n[lastIdx].content}\n\nError: ${err.message}` };
          return n;
        }
        return [...n, { role: 'assistant', content: `Error: ${err.message}` }];
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setMessages(p => [...p, { role: 'user', content: `Uploading ${file.name}...` }]);
    try {
      const res = await uploadFile(file, selectedWorkspaceId);
      setMessages(p => [...p, { role: 'assistant', content: `**${file.name}** uploaded — ${res.storedVectors} vectors from ${res.totalChunks} chunks. Ready to answer questions.` }]);
      await fetchDocs();
      const updatedWorkspaces = await fetchWorkspaces();
      if (selectedWorkspaceId && res.mongoDocumentId) {
        setActiveDocumentIds(prev => [...new Set([...prev, res.mongoDocumentId])]);
        const stillSelected = updatedWorkspaces.find(ws => ws._id === selectedWorkspaceId);
        if (!stillSelected) setSelectedWorkspaceId(null);
      }
    } catch (err) {
      setMessages(p => [...p, { role: 'assistant', content: `Upload failed: ${err.message}` }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      await deleteChat(chatId);
      setChats(p => p.filter(c => c._id !== chatId));
      if (selectedChatId === chatId) setSelectedChatId(null);
    } catch (err) { console.error('Failed to delete chat', err); }
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
      content: `Ready to assist across **${workspace.name}** using ${docIds.length} document${docIds.length === 1 ? '' : 's'}.`
    }]);
    navigate('/chat');
  };

  const handleSelectChat = (chat) => {
    setSelectedChatId(chat._id);
    if (chat.activeDocumentIds?.length) setActiveDocumentIds(chat.activeDocumentIds);
  };

  const handleCreateWorkspace = async (name, docIds) => {
    if (isBusyWorkspace || !name.trim() || docIds.length === 0) return;
    setIsBusyWorkspace(true);
    try {
      const workspace = await createWorkspace({ name: name.trim(), documentIds: docIds });
      setWorkspaces(prev => prev.some(w => w._id === workspace._id) ? prev : [workspace, ...prev]);
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
    } catch (err) { console.error('Failed to delete workspace', err); }
    finally { setIsBusyWorkspace(false); }
  };

  const toggleActiveDocument = (docId) => {
    setActiveDocumentIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
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
    } finally { setIsBusyWorkspace(false); }
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
    } finally { setIsBusyWorkspace(false); }
  };

  return {
    // State
    documents, workspaces, messages, input, chats,
    selectedDocumentId, selectedWorkspaceId, selectedChatId,
    selectedDocName, selectedScopeName,
    activeDocumentIds, workspaceDocuments, includedDocumentIds,
    isLoading, isStreaming, isUploading, isBusyWorkspace,
    isWorkspaceMode, selectedWorkspace, mode,
    messagesEndRef, fileInputRef,

    // Setters
    setInput, setMode, setSelectedChatId,

    // Handlers
    handleSubmit, handleFileUpload, handleDeleteChat,
    handleSelectDocument, handleSelectWorkspace, handleSelectChat,
    handleCreateWorkspace, handleDeleteWorkspace,
    toggleActiveDocument,
    handleAddDocumentToWorkspace, handleRemoveDocumentFromWorkspace,
  };
}
