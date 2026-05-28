import { useState } from 'react';

export default function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
  onDelete,
  suffix,
  className = '',
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`focus-ring ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        width: '100%',
        height: 34,
        padding: '0 var(--space-3)',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        fontSize: 'var(--text-sm)',
        fontFamily: 'var(--font-sans)',
        fontWeight: active ? 500 : 400,
        color: active ? 'var(--text-primary)' : hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active ? 'var(--accent-subtle)' : hovered ? 'var(--bg-elevated)' : 'transparent',
        transition: 'all 120ms ease',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {icon && (
        <span style={{
          display: 'flex', alignItems: 'center', flexShrink: 0,
          color: active ? 'var(--accent)' : 'var(--text-tertiary)',
          width: 16, height: 16,
        }}>
          {icon}
        </span>
      )}
      <span style={{
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', minWidth: 0,
      }}>
        {label}
      </span>
      {suffix && !hovered && (
        <span style={{ flexShrink: 0 }}>{suffix}</span>
      )}
      {onDelete && hovered && (
        <span
          role="button"
          tabIndex={0}
          title="Delete"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onDelete(); } }}
          style={{
            position: 'absolute', right: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: 'var(--radius-sm)',
            color: 'var(--text-tertiary)', cursor: 'pointer',
            transition: 'all 100ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--danger-subtle)';
            e.currentTarget.style.color = 'var(--danger)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </span>
      )}
    </div>
  );
}
