export default function Skeleton({ width, height = 16, rounded = 'var(--radius)', className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width || '100%',
        height,
        borderRadius: rounded,
      }}
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: 14,
            borderRadius: 'var(--radius-sm)',
            width: i === lines - 1 ? '60%' : '100%',
          }}
        />
      ))}
    </div>
  );
}
