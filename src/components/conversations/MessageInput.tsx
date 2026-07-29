import { useState, KeyboardEvent } from 'react';
import { Send, Paperclip } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => void;
  onAttachFile?: () => void;
  onAttachFolder?: () => void;
  onPasteFile?: (path: string) => void;
  onPasteBuffer?: (buffer: ArrayBuffer, mimeType: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_CHAR_LIMIT = 10000;

import { FolderUp } from 'lucide-react';

export function MessageInput({ onSend, onAttachFile, onAttachFolder, onPasteFile, onPasteBuffer, disabled, placeholder }: MessageInputProps) {
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

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      const files = Array.from(e.clipboardData.files);
      
      for (const file of files) {
        // @ts-ignore - path exists in Electron's File object implementation
        const path = file.path;
        if (path && onPasteFile) {
          onPasteFile(path);
        } else if (onPasteBuffer) {
          const buffer = await file.arrayBuffer();
          onPasteBuffer(buffer, file.type);
        }
      }
    }
  };

  const charCount = content.length;
  const isNearLimit = charCount > MAX_CHAR_LIMIT * 0.8;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          backgroundColor: 'var(--bg-input)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)'
        }}
      >
        {onAttachFile && (
          <button
            onClick={onAttachFile}
            disabled={disabled}
            title="Attach File"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'transparent',
              color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
              border: 'none',
              cursor: disabled ? 'default' : 'pointer',
              flexShrink: 0,
              transition: 'color var(--transition-fast)'
            }}
          >
            <Paperclip size={16} strokeWidth={1.5} />
          </button>
        )}
        
        {onAttachFolder && (
          <button
            onClick={onAttachFolder}
            disabled={disabled}
            title="Attach Folder"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'transparent',
              color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
              border: 'none',
              cursor: disabled ? 'default' : 'pointer',
              flexShrink: 0,
              transition: 'color var(--transition-fast)'
            }}
          >
            <FolderUp size={16} strokeWidth={1.5} />
          </button>
        )}

        <textarea
          rows={1}
          value={content}
          maxLength={MAX_CHAR_LIMIT}
          disabled={disabled}
          placeholder={disabled ? 'Peer is offline — messaging unavailable' : placeholder || 'Type a message...'}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            fontSize: 'var(--font-size-body)',
            resize: 'none',
            fontFamily: 'var(--font-family)',
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
            width: 30,
            height: 30,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: disabled || !content.trim() ? 'var(--bg-card)' : 'var(--accent-primary)',
            color: disabled || !content.trim() ? 'var(--text-muted)' : '#ffffff',
            border: 'none',
            cursor: disabled || !content.trim() ? 'default' : 'pointer',
            transition: 'background-color var(--transition-fast)',
            flexShrink: 0
          }}
        >
          <Send size={15} strokeWidth={1.5} />
        </button>
      </div>

      {isNearLimit && (
        <div
          style={{
            textAlign: 'right',
            fontSize: 'var(--font-size-meta)',
            color: charCount >= MAX_CHAR_LIMIT ? 'var(--status-error)' : 'var(--text-secondary)',
            paddingRight: 'var(--space-2)'
          }}
        >
          {charCount} / {MAX_CHAR_LIMIT}
        </div>
      )}
    </div>
  );
}
