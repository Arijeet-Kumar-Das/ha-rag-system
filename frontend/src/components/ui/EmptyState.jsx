export default function EmptyState({ icon, title, description, action }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-12) var(--space-6)',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div
          style={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-tertiary)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {icon}
        </div>
      )}
      {title && (
        <h3
          style={{
            fontSize: 'var(--text-base)',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-1)',
          }}
        >
          {title}
        </h3>
      )}
      {description && (
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-tertiary)',
            maxWidth: 260,
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          {action}
        </div>
      )}
    </div>
  );
}
