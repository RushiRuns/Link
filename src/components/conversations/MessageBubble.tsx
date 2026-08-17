import { LinkMessage } from '../../types/ipc';
import { Copy, Edit2, Trash2, CornerUpLeft, Check, CheckCheck, Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { usePeersStore } from '../../stores/peers.store';

interface MessageBubbleProps {
  message: LinkMessage;
  isSelf: boolean;
  showSenderLabel?: boolean;
  isLatestMessage?: boolean;
  repliedMessage?: LinkMessage | null; // null if not found
  onReply?: () => void;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRetry?: () => void;
}

export function MessageBubble({ message, isSelf, showSenderLabel, isLatestMessage, repliedMessage, onReply, onCopy, onEdit, onDelete, onRetry }: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isReplyExpanded, setIsReplyExpanded] = useState(false);
  const { peers } = usePeersStore();

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const getSenderName = (msg: LinkMessage | null | undefined) => {
    if (!msg) return 'Unknown';
    if (msg.senderName !== 'Teammate' && msg.senderName) return msg.senderName;
    const peer = peers.get(msg.senderId);
    return peer?.displayName || 'Teammate';
  };

  const renderStatusTicks = () => {
    if (!isSelf) return null;

    switch (message.deliveryStatus) {
      case 'sending':
        return (
          <span title="Sending" aria-label="Sending" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Clock size={12} strokeWidth={2} style={{ color: 'var(--text-secondary)', opacity: 0.7 }} />
          </span>
        );
      case 'sent':
        return (
          <span title="Sent" aria-label="Sent" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Check size={14} strokeWidth={2.5} style={{ color: 'var(--text-secondary)' }} />
          </span>
        );
      case 'delivered':
        return (
          <span title="Delivered" aria-label="Delivered" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <CheckCheck size={14} strokeWidth={2.5} style={{ color: 'var(--text-secondary)' }} />
          </span>
        );
      case 'failed':
        return (
          <span 
            title="Failed to deliver. Click to retry." 
            aria-label="Failed to deliver. Click to retry."
            onClick={onRetry} 
            style={{ display: 'inline-flex', alignItems: 'center', cursor: onRetry ? 'pointer' : 'default' }}
          >
            <AlertTriangle size={12} strokeWidth={2} style={{ color: 'var(--status-error)' }} />
          </span>
        );
      default:
        return null;
    }
  };

  const renderContentWithLinks = (text: string) => {
    // Basic regex to match http:// and https:// URLs
    const urlRegex = /(https?:\/\/[^\s]*[^\s.,!?"'])/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        let isValidUrl = false;
        try {
          const urlObj = new URL(part);
          if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
            isValidUrl = true;
          }
        } catch (e) {
          // Invalid URL
        }

        if (isValidUrl) {
          return (
            <span
              key={i}
              role="link"
              tabIndex={0}
              onClick={() => window.electron?.openExternal(part)}
              onKeyDown={(e) => { if (e.key === 'Enter') window.electron?.openExternal(part); }}
              style={{
                color: 'var(--accent-primary)',
                textDecoration: 'underline',
                cursor: 'pointer',
                wordBreak: 'break-all'
              }}
              onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'none')}
              onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            >
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  return (
    <div
      id={`msg-${message.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isSelf ? 'flex-end' : 'flex-start',
        marginBottom: 'var(--space-2)',
        transition: 'background-color 0.5s ease'
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
          {getSenderName(message)}
        </span>
      )}

      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsHovered(false);
          }
        }}
        tabIndex={0}
        style={{
          position: 'relative',
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
        {isHovered && (
          <div
            style={{
              position: 'absolute',
              top: '-14px',
              left: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              zIndex: 10
            }}
          >
            <button
              onClick={onReply}
              title="Reply"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px', display: 'flex', alignItems: 'center' }}
            >
              <CornerUpLeft size={12} strokeWidth={1.5} />
            </button>
            <button
              onClick={onCopy}
              title="Copy"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px', display: 'flex', alignItems: 'center' }}
            >
              <Copy size={12} strokeWidth={1.5} />
            </button>
            {isSelf && isLatestMessage && (
              <button
                onClick={onEdit}
                title="Edit"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px', display: 'flex', alignItems: 'center' }}
              >
                <Edit2 size={12} strokeWidth={1.5} />
              </button>
            )}
            {isSelf && (
              <button
                onClick={onDelete}
                title="Delete"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--status-offline)', padding: '2px', display: 'flex', alignItems: 'center' }}
              >
                <Trash2 size={12} strokeWidth={1.5} />
              </button>
            )}
          </div>
        )}
        
        {message.replyToMessageId && (
          <div
            onClick={() => {
              setIsReplyExpanded(prev => !prev);
              const el = document.getElementById(`msg-${message.replyToMessageId}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.style.backgroundColor = 'var(--bg-hover)';
                setTimeout(() => el.style.backgroundColor = 'transparent', 2000);
              }
            }}
            style={{
              backgroundColor: 'rgba(0,0,0,0.1)',
              borderLeft: '3px solid var(--accent-primary)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-1) var(--space-2)',
              marginBottom: 'var(--space-2)',
              fontSize: '0.85em',
              opacity: 0.9,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              cursor: 'pointer'
            }}
          >
            <div style={{ color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CornerUpLeft size={12} strokeWidth={2} />
              {getSenderName(repliedMessage)}
            </div>
            <div style={{ whiteSpace: isReplyExpanded ? 'pre-wrap' : 'nowrap', overflow: isReplyExpanded ? 'visible' : 'hidden', textOverflow: isReplyExpanded ? 'clip' : 'ellipsis' }}>
              {repliedMessage ? repliedMessage.content : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }} title="The original message was deleted or cleared locally.">
                  <AlertCircle size={12} strokeWidth={1.5} />
                  <i>Original message unavailable</i>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ whiteSpace: 'pre-wrap' }}>{renderContentWithLinks(message.content)}</div>

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
          {message.isEdited && <span style={{ fontStyle: 'italic', marginRight: '2px' }} title="Edited">(edited)</span>}
          <span>{formattedTime}</span>
          {renderStatusTicks()}
        </div>
      </div>
    </div>
  );
}
