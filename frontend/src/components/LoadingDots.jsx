export default function LoadingDots() {
  return (
    <div style={{ display: 'flex', width: '100%', gap: 'var(--space-4)', padding: 'var(--space-6) 0' }}>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 'var(--space-3)',
        }}>
          HA-RAG
        </div>

        {/* Animated typing indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--accent)',
                  opacity: 0.4,
                  animation: `pulse-subtle 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            Searching documents...
          </span>
        </div>

        {/* Skeleton lines for the response */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {[100, 95, 72].map((w, i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                height: 14,
                borderRadius: 'var(--radius-sm)',
                width: `${w}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}