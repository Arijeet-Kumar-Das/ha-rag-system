import { useState } from "react";
import IconButton from "./ui/IconButton";

export default function SourceCard({ sources }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div style={{ width: '100%', marginTop: 'var(--space-4)' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="focus-ring"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-1) var(--space-3) var(--space-1) var(--space-2)',
          borderRadius: 'var(--radius)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          fontSize: 'var(--text-xs)',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-surface)';
          e.currentTarget.style.borderColor = 'var(--border-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-elevated)';
          e.currentTarget.style.borderColor = 'var(--border-color)';
        }}
      >
        <svg
          style={{
            width: 14,
            height: 14,
            transition: 'transform var(--transition-fast)',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <svg style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        Sources ({sources.length})
      </button>

      {isExpanded && (
        <div style={{
          marginTop: 'var(--space-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}>
          {sources.map((source, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3) var(--space-4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <svg style={{ width: 14, height: 14, color: 'var(--accent)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {source.fileName || "Unknown Source"}
                  </span>
                </div>
                <span style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-tertiary)',
                  background: 'var(--bg-elevated)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  Section {source.chunkIndex ?? "?"}
                </span>
              </div>
              <p style={{
                fontSize: 'var(--text-xs)',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                margin: 0,
              }}>
                {source.text
                  ? `"${source.text.slice(0, 200)}${source.text.length > 200 ? "..." : ""}"`
                  : "No preview available."}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
