import React, { useState, useEffect } from 'react';
import { X, Send, File as FileIcon, Folder, ChevronLeft, ChevronRight } from 'lucide-react';

export interface PreviewItem {
  path?: string;
  buffer?: ArrayBuffer;
  mimeType?: string;
  name: string;
  size: number;
  isFolder: boolean;
}

interface FilePreviewModalProps {
  items: PreviewItem[];
  recipientName: string;
  onSend: (message: string) => void;
  onCancel: () => void;
}

export function FilePreviewModal({ items, recipientName, onSend, onCancel }: FilePreviewModalProps) {
  const [message, setMessage] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});

  const currentItem = items[currentIndex];

  useEffect(() => {
    // Generate previews for images via IPC to avoid local file restrictions
    let isMounted = true;
    const fetchPreviews = async () => {
      const newPreviews = { ...imagePreviews };
      let changed = false;

      for (const item of items) {
        if (item.path && item.path.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) && !newPreviews[item.path]) {
          try {
            if (window.link?.fileTransfer?.getThumbnail) {
              const dataUrl = await window.link.fileTransfer.getThumbnail(item.path);
              if (dataUrl) {
                newPreviews[item.path] = dataUrl;
                changed = true;
              }
            }
          } catch (err) {
            console.error('Failed to load thumbnail for', item.path, err);
          }
        }
      }

      if (changed && isMounted) {
        setImagePreviews(newPreviews);
      }
    };

    fetchPreviews();
    return () => {
      isMounted = false;
    };
  }, [items]);

  const handleSend = () => {
    onSend(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--bg-dark)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Header */}
      <div style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-main)',
            cursor: 'pointer',
            marginRight: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={24} />
        </button>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
          Send to {recipientName}
        </div>
      </div>

      {/* Main Preview Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '40px',
        backgroundColor: 'rgba(0,0,0,0.3)'
      }}>
        {items.length > 1 && (
          <button
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            style={{
              position: 'absolute',
              left: '20px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: 'var(--text-main)',
              cursor: currentIndex === 0 ? 'default' : 'pointer',
              opacity: currentIndex === 0 ? 0.3 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronLeft size={24} />
          </button>
        )}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          {currentItem?.path && imagePreviews[currentItem.path] ? (
            <img
              src={imagePreviews[currentItem.path]}
              alt={currentItem.name}
              style={{
                maxWidth: '100%',
                maxHeight: '60vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
              }}
            />
          ) : (
            <div style={{
              width: '160px',
              height: '160px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
              {currentItem?.isFolder ? (
                <Folder size={64} color="var(--primary-emerald)" />
              ) : (
                <FileIcon size={64} color="var(--primary-indigo)" />
              )}
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: '4px', wordBreak: 'break-all' }}>
              {currentItem?.name}
            </div>
            <div style={{ color: 'var(--text-muted)' }}>
              {currentItem && formatSize(currentItem.size)} {currentItem?.isFolder && '(Folder)'}
            </div>
          </div>
        </div>

        {items.length > 1 && (
          <button
            onClick={() => setCurrentIndex(i => Math.min(items.length - 1, i + 1))}
            disabled={currentIndex === items.length - 1}
            style={{
              position: 'absolute',
              right: '20px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: 'var(--text-main)',
              cursor: currentIndex === items.length - 1 ? 'default' : 'pointer',
              opacity: currentIndex === items.length - 1 ? 0.3 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        padding: '20px',
        backgroundColor: 'var(--bg-card)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          maxWidth: '800px',
          width: '100%',
          margin: '0 auto'
        }}>
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a caption..."
            autoFocus
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '24px',
              padding: '12px 20px',
              color: 'var(--text-main)',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--primary-indigo)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
          />
          <button
            onClick={handleSend}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-indigo)',
              border: 'none',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              transition: 'transform 0.15s ease'
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <Send size={20} style={{ transform: 'translate(2px, 1px)' }} />
          </button>
        </div>

        {/* Thumbnails */}
        {items.length > 1 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            maxWidth: '800px',
            width: '100%',
            margin: '0 auto',
            paddingBottom: '8px',
            scrollbarWidth: 'thin'
          }}>
            {items.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                style={{
                  minWidth: '50px',
                  height: '50px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: `2px solid ${idx === currentIndex ? 'var(--primary-indigo)' : 'transparent'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  opacity: idx === currentIndex ? 1 : 0.6,
                  transition: 'all 0.2s ease'
                }}
              >
                {item.path && imagePreviews[item.path] ? (
                  <img src={imagePreviews[item.path]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : item.isFolder ? (
                  <Folder size={20} color="var(--primary-emerald)" />
                ) : (
                  <FileIcon size={20} color="var(--primary-indigo)" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
