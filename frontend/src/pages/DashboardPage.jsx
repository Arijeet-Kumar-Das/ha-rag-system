import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocuments, uploadFile, getWorkspaces } from '../api';
import Sidebar from '../components/sidebar/Sidebar';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import IconButton from '../components/ui/IconButton';

export default function DashboardPage() {
  const [documents, setDocuments] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocs();
    fetchWorkspaces();
  }, []);

  const fetchDocs = async () => {
    try {
      setIsLoading(true);
      const data = await getDocuments();
      setDocuments(data || []);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const data = await getWorkspaces();
      setWorkspaces(data || []);
    } catch (err) {
      console.error('Failed to fetch workspaces', err);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      await uploadFile(file);
      await fetchDocs();
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) return;
    try {
      setIsUploading(true);
      await uploadFile(file);
      await fetchDocs();
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const sidebarProps = {
    documents,
    workspaces,
    chats: [],
    selectedDocumentId: null,
    selectedWorkspaceId: null,
    selectedChatId: null,
    onSelectDocument: (id) => navigate(`/chat/${id}`),
    onSelectWorkspace: (ws) => navigate('/chat'),
    onSelectChat: () => {},
    onNewChat: () => navigate('/chat'),
    onDeleteChat: () => {},
    onDeleteWorkspace: () => {},
    onOpenWorkspaceModal: () => {},
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} {...sidebarProps} />
      <div style={{ width: 'var(--sidebar-width)', flexShrink: 0 }} className="hidden sm:block" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'auto' }}>
        <header style={{
          display: 'flex', alignItems: 'center', height: 56,
          padding: '0 var(--space-5)', borderBottom: '1px solid var(--border-color)', flexShrink: 0, gap: 'var(--space-4)',
        }}>
          <IconButton className="sm:hidden" onClick={() => setSidebarOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </IconButton>
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
        </header>

        <main style={{ padding: 'var(--space-8) var(--space-6)', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 'var(--space-8)', flexWrap: 'wrap', gap: 'var(--space-4)',
          }}>
            <div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Library
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>
                {documents.length} document{documents.length !== 1 ? 's' : ''} available for research.
              </p>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleUpload} accept=".pdf" style={{ display: 'none' }} />
            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload Document
                </>
              )}
            </Button>
          </div>

          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              {[1, 2, 3].map(i => <Skeleton key={i} height={120} rounded="var(--radius-lg)" />)}
            </div>
          ) : documents.length === 0 ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              <EmptyState
                icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                }
                title="No documents yet"
                description="Upload a PDF or drag it here to begin asking questions and extracting insights."
                action={<Button onClick={() => fileInputRef.current?.click()}>Upload PDF</Button>}
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              {documents.map((doc) => (
                <button
                  key={doc._id}
                  onClick={() => navigate(`/chat/${doc._id}`)}
                  style={{
                    padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer', transition: 'all var(--transition-fast)',
                    display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
                    background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                    textAlign: 'left', fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-hover)';
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.background = 'var(--bg-surface)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--radius)',
                      background: 'var(--accent-subtle)', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate-text" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {doc.fileName}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    marginTop: 'auto', paddingTop: 'var(--space-3)',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)',
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {doc.chunkCount} chunk{doc.chunkCount !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Research →</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
