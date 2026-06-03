import { memo, useCallback } from 'react';

const SidebarItem = memo(function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
  onDelete,
  suffix,
  className = '',
}) {
  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete?.();
  }, [onDelete]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') onClick?.();
  }, [onClick]);

  const handleDeleteKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      onDelete?.();
    }
  }, [onDelete]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`sidebar-item focus-ring ${active ? 'sidebar-item--active' : ''} ${className}`}
    >
      {icon && (
        <span className="sidebar-item__icon">
          {icon}
        </span>
      )}
      <span className="sidebar-item__label">
        {label}
      </span>
      {suffix && (
        <span className={`sidebar-item__suffix ${onDelete ? 'sidebar-item__suffix--hideable' : ''}`}>
          {suffix}
        </span>
      )}
      {onDelete && (
        <span
          role="button"
          tabIndex={0}
          title="Delete"
          onClick={handleDelete}
          onKeyDown={handleDeleteKeyDown}
          className="sidebar-item__delete"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </span>
      )}
    </div>
  );
});

export default SidebarItem;
