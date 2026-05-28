import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useLogo from '../../hooks/useLogo';
import SidebarSection from './SidebarSection';
import SidebarItem from './SidebarItem';
import IconButton from '../ui/IconButton';
import Button from '../ui/Button';

const icons = {
  dashboard: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  chat: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  doc: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  workspace: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  ),
  plus: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  ),
  addDoc: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  ),
  sun: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  moon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  ),
  logout: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  check: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

export default function Sidebar({
  isOpen,
  onToggle,
  documents = [],
  workspaces = [],
  chats = [],
  selectedDocumentId,
  selectedWorkspaceId,
  selectedChatId,
  onSelectDocument,
  onSelectWorkspace,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onDeleteWorkspace,
  onOpenWorkspaceModal,
  // Workspace document management
  onAddDocToWorkspace,
  onRemoveDocFromWorkspace,
  workspaceDocuments = [],
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const logo = useLogo();

  // Docs in the current workspace (by ID)
  const wsDocIds = new Set(workspaceDocuments.map(d => d._id));
  // Docs NOT in the workspace yet
  const availableToAdd = documents.filter(d => !wsDocIds.has(d._id));

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="sm:hidden"
          style={{
            position: 'fixed', inset: 0, zIndex: 39,
            background: 'rgba(0,0,0,0.4)',
          }}
        />
      )}

      <aside
        className="sidebar-aside"
        style={{
          position: 'fixed', top: 0, left: 0, zIndex: 40,
          width: 'var(--sidebar-width)', height: '100vh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          transition: 'transform var(--transition-slow)',
        }}
      >
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: 'var(--space-5) var(--space-5) var(--space-3)',
        }}>
          <img src={logo} alt="HA-RAG" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <div>
            <div style={{
              fontSize: 'var(--text-base)', fontWeight: 700,
              color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1,
            }}>
              HA-RAG
            </div>
            <div style={{
              fontSize: 9, color: 'var(--text-tertiary)',
              letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2,
            }}>
              Research Assistant
            </div>
          </div>
        </div>

        {/* New Chat */}
        <div style={{ padding: 'var(--space-3) var(--space-3) var(--space-1)' }}>
          <Button variant="secondary" size="md" onClick={onNewChat} style={{ width: '100%', justifyContent: 'center' }}>
            {icons.plus}
            New Chat
          </Button>
        </div>

        {/* Navigation */}
        <div style={{ padding: 'var(--space-3) var(--space-2)' }}>
          <SidebarItem icon={icons.dashboard} label="Dashboard" onClick={() => navigate('/dashboard')} />
        </div>

        <div style={{ margin: '0 var(--space-5)', height: 1, background: 'var(--border-color)' }} />

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingTop: 'var(--space-3)' }}>
          {/* Workspaces */}
          <SidebarSection
            label="Workspaces"
            action={
              <IconButton size="sm" title="Create workspace" onClick={onOpenWorkspaceModal}>
                {icons.plus}
              </IconButton>
            }
          >
            {workspaces.length > 0 ? (
              workspaces.map(ws => (
                <SidebarItem
                  key={ws._id}
                  icon={icons.workspace}
                  label={ws.name}
                  active={selectedWorkspaceId === ws._id}
                  onClick={() => onSelectWorkspace(ws)}
                  onDelete={() => onDeleteWorkspace(ws._id)}
                />
              ))
            ) : (
              <div style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                No workspaces yet
              </div>
            )}
          </SidebarSection>

          <div style={{ margin: 'var(--space-3) var(--space-5)', height: 1, background: 'var(--border-color)' }} />

          {/* Library — with add-to-workspace option when a workspace is selected */}
          <SidebarSection
            label="Library"
            action={
              selectedWorkspaceId && availableToAdd.length > 0 ? (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: 500, paddingRight: 'var(--space-1)' }}>
                  + Add
                </span>
              ) : null
            }
          >
            {documents.length > 0 ? (
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {documents.map(doc => {
                  const inWorkspace = wsDocIds.has(doc._id);
                  const isLibraryActive = !selectedWorkspaceId && selectedDocumentId === doc._id;

                  return (
                    <div
                      key={doc._id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                        paddingRight: selectedWorkspaceId ? 4 : 0,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <SidebarItem
                          icon={icons.doc}
                          label={doc.fileName}
                          active={isLibraryActive}
                          onClick={() => {
                            if (selectedWorkspaceId) {
                              // In workspace mode, clicking a doc adds/removes it from the workspace
                              if (inWorkspace) {
                                onRemoveDocFromWorkspace?.(doc._id);
                              } else {
                                onAddDocToWorkspace?.(doc._id);
                              }
                            } else {
                              onSelectDocument(doc._id);
                            }
                          }}
                          suffix={
                            selectedWorkspaceId ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 18, height: 18, borderRadius: 'var(--radius-sm)',
                                background: inWorkspace ? 'var(--accent-subtle)' : 'transparent',
                                color: inWorkspace ? 'var(--accent)' : 'var(--text-tertiary)',
                                border: inWorkspace ? 'none' : '1px solid var(--border-color)',
                                fontSize: 10,
                              }}>
                                {inWorkspace ? icons.check : null}
                              </span>
                            ) : undefined
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                No documents uploaded
              </div>
            )}
          </SidebarSection>

          <div style={{ margin: 'var(--space-3) var(--space-5)', height: 1, background: 'var(--border-color)' }} />

          {/* History */}
          <SidebarSection
            label="History"
            action={
              chats.length > 0 ? (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 500, paddingRight: 'var(--space-1)' }}>
                  {chats.length}
                </span>
              ) : null
            }
          >
            {chats.length > 0 ? (
              chats.map(chat => (
                <SidebarItem
                  key={chat._id}
                  icon={icons.chat}
                  label={chat.title}
                  active={selectedChatId === chat._id}
                  onClick={() => onSelectChat(chat)}
                  onDelete={() => onDeleteChat(chat._id)}
                />
              ))
            ) : (
              <div style={{ padding: 'var(--space-6) var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                No conversations yet
              </div>
            )}
          </SidebarSection>
        </div>

        {/* Footer */}
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <IconButton size="md" title={isDark ? 'Light mode' : 'Dark mode'} onClick={toggleTheme}>
            {isDark ? icons.sun : icons.moon}
          </IconButton>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 500 }}>v2.0</div>
          <IconButton size="md" variant="danger" title="Log out" onClick={() => { logout(); navigate('/'); }}>
            {icons.logout}
          </IconButton>
        </div>
      </aside>

      <style>{`
        @media (min-width: 640px) {
          .sidebar-aside { transform: translateX(0) !important; }
        }
        @media (max-width: 639px) {
          .sidebar-aside { transform: translateX(${isOpen ? '0' : '-100%'}); }
        }
      `}</style>
    </>
  );
}