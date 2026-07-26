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
        return <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>🕒</span>;
      case 'sent':
        return <span style={{ opacity: 0.8, fontSize: '0.75rem' }} title="Sent">✓</span>;
      case 'delivered':
        return <span style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 'bold' }} title="Delivered">✓✓</span>;
      case 'failed':
        return <span style={{ color: 'var(--status-error)', fontSize: '0.7rem' }} title="Failed to deliver">⚠️</span>;
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
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            marginBottom: '2px',
            paddingLeft: 'var(--space-2)'
          }}
        >
          {message.senderName}
        </span>
      )}

      <div
        style={{
          maxWidth: '70%',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: isSelf ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
          backgroundColor: isSelf ? 'var(--accent-primary)' : 'var(--bg-card)',
          color: isSelf ? '#ffffff' : 'var(--text-primary)',
          boxShadow: 'var(--shadow-sm)',
          wordBreak: 'break-word',
          fontSize: '0.88rem',
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
            marginTop: '4px',
            fontSize: '0.68rem',
            opacity: 0.75,
            color: isSelf ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-muted)'
          }}
        >
          <span>{formattedTime}</span>
          {renderStatusTicks()}
        </div>
      </div>
    </div>
  );
}
