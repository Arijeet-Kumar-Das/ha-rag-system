import { forwardRef } from 'react';

const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  style = {},
  ...props
}, ref) => {

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    fontFamily: 'var(--font-sans)',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    transition: 'all 150ms ease',
    opacity: disabled ? 0.45 : 1,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    lineHeight: 1,
  };

  const sizeStyles = {
    sm: { height: 32, padding: '0 14px', fontSize: 'var(--text-xs)', gap: 6, borderRadius: 'var(--radius)' },
    md: { height: 40, padding: '0 20px', fontSize: 'var(--text-sm)', gap: 8, borderRadius: 'var(--radius-md)' },
    lg: { height: 48, padding: '0 28px', fontSize: 'var(--text-base)', gap: 10, borderRadius: 'var(--radius-md)' },
  };

  const variantStyles = {
    primary: {
      background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
      color: 'var(--text-inverse)',
      boxShadow: '0 1px 3px rgba(201,165,90,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
      border: 'none',
    },
    secondary: {
      background: 'var(--bg-elevated)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-sm)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent',
    },
    danger: {
      background: 'var(--danger-subtle)',
      color: 'var(--danger)',
      border: '1px solid transparent',
    },
  };

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`focus-ring ${className}`}
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === 'primary') {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(201,165,90,0.45), inset 0 1px 0 rgba(255,255,255,0.2)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        } else if (variant === 'secondary') {
          e.currentTarget.style.borderColor = 'var(--border-hover)';
          e.currentTarget.style.background = 'var(--bg-surface)';
        } else if (variant === 'ghost') {
          e.currentTarget.style.background = 'var(--accent-subtle)';
          e.currentTarget.style.color = 'var(--text-primary)';
        } else if (variant === 'danger') {
          e.currentTarget.style.background = 'var(--danger)';
          e.currentTarget.style.color = 'white';
        }
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        const vs = variantStyles[variant];
        e.currentTarget.style.background = vs.background;
        e.currentTarget.style.color = vs.color;
        e.currentTarget.style.boxShadow = vs.boxShadow || '';
        e.currentTarget.style.borderColor = vs.border?.includes('solid') ? vs.border.split('solid')[1]?.trim() || '' : '';
        e.currentTarget.style.transform = '';
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        if (!disabled) e.currentTarget.style.transform = '';
      }}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
