import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  className = '',
  id,
  style = {},
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`focus-ring ${className}`}
        style={{
          height: 42,
          width: '100%',
          padding: '0 var(--space-4)',
          fontSize: 'var(--text-sm)',
          fontFamily: 'var(--font-sans)',
          color: 'var(--text-primary)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          outline: 'none',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          ...style,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent)';
          e.target.style.boxShadow = '0 0 0 3px rgba(201,165,90,0.1)';
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-color)';
          e.target.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', fontWeight: 500 }}>
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
