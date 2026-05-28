const variantStyles = {
  default: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
  },
  accent: {
    background: 'var(--accent-subtle)',
    color: 'var(--accent)',
    border: '1px solid transparent',
  },
  success: {
    background: 'var(--success-subtle)',
    color: 'var(--success)',
    border: '1px solid transparent',
  },
  warning: {
    background: 'var(--warning-subtle)',
    color: 'var(--warning)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--danger-subtle)',
    color: 'var(--danger)',
    border: '1px solid transparent',
  },
};

export default function Badge({ children, variant = 'default', icon, className = '' }) {
  const styles = variantStyles[variant];

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        height: 22,
        padding: '0 var(--space-2)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        fontFamily: 'var(--font-sans)',
        borderRadius: 'var(--radius-sm)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...styles,
      }}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
}
