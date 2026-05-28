import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useChatWorkspace from '../hooks/useChatWorkspace';
import Sidebar from '../components/sidebar/Sidebar';
import ChatMessage from '../components/ChatMessage';
import LoadingDots from '../components/LoadingDots';
import IconButton from '../components/ui/IconButton';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

export default function ChatPage() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showWsModal, setShowWsModal] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsDocIds, setWsDocIds] = useState([]);

  const hook = useChatWorkspace(docId, navigate);
  const {
    documents, workspaces, messages, input, chats,
    selectedDocumentId, selectedWorkspaceId, selectedChatId,
    selectedScopeName, activeDocumentIds, workspaceDocuments,
    isLoading, isStreaming, isUploading, isBusyWorkspace,
    isWorkspaceMode, mode,
    messagesEndRef, fileInputRef,
    setInput, setMode,
    handleSubmit, handleFileUpload, handleDeleteChat,
    handleSelectDocument, handleSelectWorkspace, handleSelectChat,
    handleCreateWorkspace, handleDeleteWorkspace,
    toggleActiveDocument,
    handleAddDocumentToWorkspace, handleRemoveDocumentFromWorkspace,
  } = hook;

  // Build sidebar props — map hook handler names to what Sidebar expects
  const sidebarProps = {
    documents,
    workspaces,
    chats,
    selectedDocumentId,
    selectedWorkspaceId,
    selectedChatId,
    workspaceDocuments,
    onSelectDocument: handleSelectDocument,
    onSelectWorkspace: handleSelectWorkspace,
    onSelectChat: handleSelectChat,
    onNewChat: () => {
      navigate('/chat');
      window.location.reload();
    },
    onDeleteChat: handleDeleteChat,
    onDeleteWorkspace: handleDeleteWorkspace,
    onOpenWorkspaceModal: () => {
      setWsName('');
      setWsDocIds([]);
      setShowWsModal(true);
    },
    onAddDocToWorkspace: handleAddDocumentToWorkspace,
    onRemoveDocFromWorkspace: handleRemoveDocumentFromWorkspace,
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} {...sidebarProps} />
      
      {/* Sidebar spacer for desktop — pushes content right */}
      <div style={{ width: 'var(--sidebar-width)', flexShrink: 0 }} className="hidden sm:block" />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', position: 'relative' }}>

        {/* Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          padding: '0 var(--space-5)',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {/* Mobile hamburger */}
            <IconButton className="sm:hidden" onClick={() => setSidebarOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </IconButton>
            
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedScopeName || 'Select a document'}
            </span>
            {isWorkspaceMode && (
              <span style={{
                fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
                background: 'var(--bg-elevated)', padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
              }}>
                {activeDocumentIds.length}/{workspaceDocuments.length} active
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {/* Mode Toggle */}
            <div style={{
              display: 'flex', background: 'var(--bg-elevated)', padding: 2,
              borderRadius: 'var(--radius)', border: '1px solid var(--border-color)',
            }}>
              {['standard', 'verified'].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: '4px 12px', fontSize: 'var(--text-xs)', fontWeight: 500,
                    borderRadius: 'calc(var(--radius) - 2px)', border: 'none', cursor: 'pointer',
                    background: mode === m ? 'var(--bg-surface)' : 'transparent',
                    color: mode === m ? (m === 'verified' ? 'var(--success)' : 'var(--text-primary)') : 'var(--text-tertiary)',
                    boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                    transition: 'all var(--transition-fast)', textTransform: 'capitalize',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Upload */}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" style={{ display: 'none' }} />
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
              <span className="hidden sm:inline">Upload</span>
            </Button>
          </div>
        </header>

        {/* Workspace active docs bar */}
        {isWorkspaceMode && workspaceDocuments.length > 0 && (
          <div style={{
            padding: 'var(--space-2) var(--space-5)', background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', flexShrink: 0,
          }}>
            {workspaceDocuments.map(doc => {
              const isActive = activeDocumentIds.includes(doc._id);
              return (
                <button
                  key={doc._id}
                  onClick={() => toggleActiveDocument(doc._id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                    padding: '4px 10px', fontSize: 'var(--text-xs)', borderRadius: 'var(--radius)',
                    border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border-color)'}`,
                    background: isActive ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all var(--transition-fast)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isActive ? <polyline points="20 6 9 17 4 12" /> : <circle cx="12" cy="12" r="10" />}
                  </svg>
                  {doc.fileName}
                </button>
              );
            })}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4) var(--space-5) 140px', scrollBehavior: 'smooth' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} />
            ))}
            {isLoading && <LoadingDots />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, var(--bg-primary) 80%, transparent)',
          padding: 'var(--space-6) var(--space-5) var(--space-5)',
        }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex', alignItems: 'flex-end', gap: 'var(--space-2)',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)', padding: 'var(--space-2)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your research..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: 'var(--text-base)',
                  padding: 'var(--space-2)', resize: 'none', minHeight: 44, maxHeight: 200,
                  fontFamily: 'var(--font-sans)',
                }}
                rows={1}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                style={{ width: 44, height: 44, padding: 0, flexShrink: 0, borderRadius: 'var(--radius-md)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </Button>
            </form>
            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 'var(--space-3)' }}>
              HA-RAG can make mistakes. Verify important information.
            </div>
          </div>
        </div>

        {/* Workspace Modal */}
        <Modal isOpen={showWsModal} onClose={() => setShowWsModal(false)} title="Create Workspace">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input label="Workspace Name" placeholder="e.g. Thesis Research" value={wsName} onChange={(e) => setWsName(e.target.value)} autoFocus />
            <div>
              <label style={{
                fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-2)', display: 'block',
              }}>
                Include Documents
              </label>
              <div style={{
                maxHeight: 200, overflowY: 'auto',
                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)',
              }}>
                {documents.map(doc => (
                  <label key={doc._id} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer', fontSize: 'var(--text-sm)',
                  }}>
                    <input
                      type="checkbox"
                      checked={wsDocIds.includes(doc._id)}
                      onChange={(e) => {
                        if (e.target.checked) setWsDocIds(p => [...p, doc._id]);
                        else setWsDocIds(p => p.filter(id => id !== doc._id));
                      }}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <span style={{ color: 'var(--text-primary)' }}>{doc.fileName}</span>
                  </label>
                ))}
                {documents.length === 0 && (
                  <div style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    No documents available. Upload some first.
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <Button variant="ghost" onClick={() => setShowWsModal(false)}>Cancel</Button>
              <Button
                onClick={() => { handleCreateWorkspace(wsName, wsDocIds); setShowWsModal(false); }}
                disabled={!wsName.trim() || wsDocIds.length === 0 || isBusyWorkspace}
              >
                Create
              </Button>
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
}
