import { LinkMessage } from '../../types/ipc';

interface MessageBubbleProps {
  message: LinkMessage;
  isSelf: boolean;
  showSenderLabel?: boolean;
}

export function MessageBubble({ message, isSelf, showSenderLabel }: MessageBubbleProps) {
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const renderStatusTicks = () => {
    if (!isSelf) return null;

    switch (message.deliveryStatus) {
      case 'sending':
        return <span style={{ color: 'var(--text-secondary)', fontSize: '11px', opacity: 0.7 }}>🕒</span>;
      case 'sent':
        return <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }} title="Sent">✓</span>;
      case 'delivered':
        return <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }} title="Delivered">✓✓</span>;
      case 'failed':
        return <span style={{ color: 'var(--status-error)', fontSize: '11px' }} title="Failed to deliver">⚠️</span>;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isSelf ? 'flex-end' : 'flex-start',
        marginBottom: 'var(--space-2)'
      }}
    >
      {showSenderLabel && !isSelf && (
        <span
          style={{
            fontSize: 'var(--font-size-meta)',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-1)',
            paddingLeft: 'var(--space-2)',
            fontWeight: 500
          }}
        >
          {message.senderName}
        </span>
      )}

      <div
        style={{
          maxWidth: '70%',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: isSelf ? 'var(--bubble-own)' : 'var(--bubble-other)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          wordBreak: 'break-word',
          fontSize: 'var(--font-size-body)',
          lineHeight: 1.45
        }}
      >
        <div>{message.content}</div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '4px',
            marginTop: 'var(--space-1)',
            fontSize: 'var(--font-size-meta)',
            color: 'var(--text-secondary)'
          }}
        >
          <span>{formattedTime}</span>
          {renderStatusTicks()}
        </div>
      </div>
    </div>
  );
}
