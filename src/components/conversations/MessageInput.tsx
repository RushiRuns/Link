import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_CHAR_LIMIT = 10000;

export function MessageInput({ onSend, disabled, placeholder }: MessageInputProps) {
  const [content, setContent] = useState('');

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setContent('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charCount = content.length;
  const isNearLimit = charCount > MAX_CHAR_LIMIT * 0.8;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          backgroundColor: 'var(--bg-input)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)'
        }}
      >
        <textarea
          rows={1}
          value={content}
          maxLength={MAX_CHAR_LIMIT}
          disabled={disabled}
          placeholder={disabled ? 'Peer is offline — messaging unavailable' : placeholder || 'Type a message...'}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            fontSize: '0.88rem',
            resize: 'none',
            fontFamily: 'inherit',
            maxHeight: 120,
            overflowY: 'auto'
          }}
        />

        <button
          onClick={handleSend}
          disabled={disabled || !content.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: '50%',
            backgroundColor: disabled || !content.trim() ? 'var(--bg-card)' : 'var(--accent-primary)',
            color: disabled || !content.trim() ? 'var(--text-muted)' : '#ffffff',
            border: 'none',
            cursor: disabled || !content.trim() ? 'default' : 'pointer',
            transition: 'background-color 0.15s ease',
            flexShrink: 0
          }}
        >
          <Send size={16} />
        </button>
      </div>

      {isNearLimit && (
        <div
          style={{
            textAlign: 'right',
            fontSize: '0.68rem',
            color: charCount >= MAX_CHAR_LIMIT ? 'var(--status-error)' : 'var(--text-muted)',
            paddingRight: 'var(--space-2)'
          }}
        >
          {charCount} / {MAX_CHAR_LIMIT}
        </div>
      )}
    </div>
  );
}
