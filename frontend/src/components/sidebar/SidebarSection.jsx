export default function SidebarSection({ label, action, children, className = '' }) {
  return (
    <div className={className} style={{ padding: '0 var(--space-2)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-3)',
          marginBottom: 'var(--space-2)',
          minHeight: 20,
        }}
      >
        <span className="section-label" style={{ padding: 0, marginBottom: 0 }}>
          {label}
        </span>
        {action}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {children}
      </div>
    </div>
  );
}
