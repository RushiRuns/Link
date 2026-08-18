import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

interface ScreenPickerModalProps {
  onSelect: (sourceId: string) => void;
  onCancel: () => void;
  mode?: 'calls' | 'remote-access';
}

export function ScreenPickerModal({ onSelect, onCancel, mode = 'calls' }: ScreenPickerModalProps) {
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchSources = async () => {
      try {
        let fetchedSources: ScreenSource[] = [];
        if (mode === 'remote-access' && window.link?.remoteAccess?.getSources) {
          fetchedSources = await window.link.remoteAccess.getSources();
        } else if (window.link?.desktopCapturer) {
          fetchedSources = await window.link.desktopCapturer.getSources();
        } else {
          console.error('[ScreenPicker] Capture API not found');
        }
        
        if (isMounted) {
          setSources(fetchedSources);
          setLoading(false);
        }
      } catch (err) {
        console.error('[ScreenPicker] Error fetching sources:', err);
        if (isMounted) setLoading(false);
      }
    };

    fetchSources();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 'var(--space-6)'
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: 900,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Share your screen</h2>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-2)',
              borderRadius: '50%',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            padding: 'var(--space-6)',
            overflowY: 'auto',
            flex: 1
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-12) 0', color: 'var(--text-secondary)' }}>
              <Loader2 size={32} className="lucide-spin" style={{ animation: 'spin 1s linear infinite', marginBottom: 'var(--space-4)' }} />
              <p style={{ margin: 0 }}>Loading screens...</p>
            </div>
          ) : sources.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--text-secondary)' }}>
              <p style={{ margin: 0 }}>No screens found to share.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 'var(--space-6)'
              }}
            >
              {sources.map((source) => (
                <div
                  key={source.id}
                  onClick={() => onSelect(source.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    border: '2px solid transparent',
                    transition: 'all 0.2s ease',
                    backgroundColor: 'var(--bg-secondary)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      aspectRatio: '16/9',
                      backgroundColor: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={source.thumbnail}
                      alt={source.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                  <div
                    style={{
                      padding: 'var(--space-3)',
                      textAlign: 'center',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {source.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
