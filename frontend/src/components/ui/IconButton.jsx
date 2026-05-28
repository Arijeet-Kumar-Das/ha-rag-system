import { forwardRef } from 'react';

const sizes = {
  sm: 28,
  md: 32,
  lg: 36,
};

const IconButton = forwardRef(({
  children,
  size = 'md',
  title,
  className = '',
  variant = 'ghost',
  disabled,
  ...props
}, ref) => {
  const dim = sizes[size];

  const variantStyles = {
    ghost: {
      background: 'transparent',
      color: 'var(--text-tertiary)',
      border: 'none',
    },
    subtle: {
      background: 'var(--bg-elevated)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-color)',
    },
    danger: {
      background: 'transparent',
      color: 'var(--text-tertiary)',
      border: 'none',
    },
  };

  return (
    <button
      ref={ref}
      title={title}
      disabled={disabled}
      className={`focus-ring ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dim,
        height: dim,
        borderRadius: 'var(--radius)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--transition-fast)',
        opacity: disabled ? 0.4 : 1,
        flexShrink: 0,
        ...variantStyles[variant],
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === 'danger') {
          e.currentTarget.style.background = 'var(--danger-subtle)';
          e.currentTarget.style.color = 'var(--danger)';
        } else {
          e.currentTarget.style.background = 'var(--bg-elevated)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        const s = variantStyles[variant];
        e.currentTarget.style.background = s.background;
        e.currentTarget.style.color = s.color;
      }}
      {...props}
    >
      {children}
    </button>
  );
});

IconButton.displayName = 'IconButton';
export default IconButton;
