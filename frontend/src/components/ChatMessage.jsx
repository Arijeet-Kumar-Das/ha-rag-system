import { memo } from "react";
import SourceCard from "./SourceCard";
import Badge from "./ui/Badge";
import ReactMarkdown from 'react-markdown';

function VerificationBadge({ verification }) {
  if (!verification) return null;

  const { isValid, confidence } = verification;

  if (isValid && confidence >= 0.7) {
    return (
      <Badge variant="success" icon={
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" />
        </svg>
      }>
        Verified ({Math.round(confidence * 100)}%)
      </Badge>
    );
  }

  if (isValid && confidence >= 0.4) {
    return (
      <Badge variant="warning" icon={
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      }>
        Partially Supported
      </Badge>
    );
  }

  return (
    <Badge variant="danger" icon={
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    }>
      Low Confidence
    </Badge>
  );
}

/**
 * Render content as plain pre-wrapped text during streaming,
 * and as full markdown only after streaming completes.
 * This avoids re-parsing the entire markdown tree on every token.
 */
function MessageContent({ content, streaming }) {
  if (streaming) {
    return <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{content || ""}</div>;
  }
  return (
    <div className="prose-chat">
      <ReactMarkdown>{content || ""}</ReactMarkdown>
    </div>
  );
}

const ChatMessage = memo(function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      padding: 'var(--space-6) 0',
      borderBottom: isUser ? 'none' : '1px solid var(--border-color)',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}>
        {/* Role Label */}
        <div style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: isUser ? 'var(--text-tertiary)' : 'var(--accent)',
          marginBottom: 'var(--space-2)',
        }}>
          {isUser ? 'You' : 'HA-RAG'}
        </div>

        {/* Message Content */}
        <div style={{
          fontSize: 'var(--text-base)',
          lineHeight: 1.75,
          color: 'var(--text-primary)',
          paddingLeft: isUser ? 'var(--space-4)' : 0,
          borderLeft: isUser ? '2px solid var(--accent-muted)' : 'none',
        }}>
          {isUser ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
          ) : (
            <MessageContent content={message.content} streaming={message.streaming} />
          )}
          {message.streaming && (
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 14,
                background: 'var(--accent)',
                marginLeft: 4,
                animation: 'pulse-subtle 1s infinite',
                transform: 'translateY(2px)',
              }}
            />
          )}
        </div>

        {/* Verification & Sources */}
        {!isUser && !message.streaming && (message.verification || (message.sources && message.sources.length > 0)) && (
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
            {message.verification && <VerificationBadge verification={message.verification} />}
            {message.sources && message.sources.length > 0 && <SourceCard sources={message.sources} />}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render when content actually changes
  const prev = prevProps.message;
  const next = nextProps.message;
  return (
    prev.content === next.content &&
    prev.streaming === next.streaming &&
    prev.role === next.role &&
    prev.verification === next.verification &&
    prev.sources === next.sources
  );
});

export default ChatMessage;
