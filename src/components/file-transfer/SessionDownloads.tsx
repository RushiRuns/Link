import { Download, Check, X, FileIcon, XCircle, FileArchive, FileText, Image as ImageIcon, FileVideo } from 'lucide-react';
import { useFileTransferStore } from '../../stores/file-transfer.store';
import { usePeersStore } from '../../stores/peers.store';

interface SessionDownloadsProps {
  onClose: () => void;
}

export function SessionDownloads({ onClose }: SessionDownloadsProps) {
  const { transfers, openTransferFolder } = useFileTransferStore();
  const { peers } = usePeersStore();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon size={20} className="text-secondary" />;
    if (mimeType.startsWith('video/')) return <FileVideo size={20} className="text-secondary" />;
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) return <FileArchive size={20} className="text-secondary" />;
    if (mimeType.startsWith('text/') || mimeType.includes('pdf')) return <FileText size={20} className="text-secondary" />;
    return <FileIcon size={20} className="text-secondary" />;
  };

  const sessionTransfers = Array.from(transfers.values())
    .filter((t) => t.direction === 'incoming' && (t.status === 'completed' || t.status === 'declined'))
    .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)); // most recent first

  const totalSavedSize = sessionTransfers
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.fileSizeBytes, 0);

  const savedCount = sessionTransfers.filter((t) => t.status === 'completed').length;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '60px',
        left: '20px',
        width: '320px',
        maxHeight: '400px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: 'var(--space-3)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-card-hover)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Download size={18} color="var(--text-primary)" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
              SESSION DOWNLOADS
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {savedCount} Files Saved • {formatBytes(totalSavedSize)}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 'var(--space-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-2)' }}>
        {sessionTransfers.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-6) 0',
              color: 'var(--text-muted)'
            }}
          >
            <Download size={32} style={{ marginBottom: 'var(--space-2)', opacity: 0.5 }} />
            <span style={{ fontSize: '13px' }}>No downloads this session</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {sessionTransfers.map((transfer) => {
              const peer = peers.get(transfer.peerId);
              const senderName = peer ? peer.displayName : 'Unknown Peer';
              const isSaved = transfer.status === 'completed';

              return (
                <div
                  key={transfer.id}
                  onClick={() => {
                    if (isSaved) openTransferFolder(transfer.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSaved ? 'var(--bg-sidebar)' : 'var(--bg-body)',
                    border: '1px solid',
                    borderColor: isSaved ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 71, 87, 0.1)',
                    cursor: isSaved ? 'pointer' : 'default',
                    transition: 'background-color var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    if (isSaved) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (isSaved) e.currentTarget.style.backgroundColor = 'var(--bg-sidebar)';
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {getFileIcon(transfer.mimeType)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={transfer.fileName}
                    >
                      {transfer.fileName}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {formatBytes(transfer.fileSizeBytes)} • From {senderName}
                    </span>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {isSaved ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: 'rgba(46, 213, 115, 0.1)',
                          color: 'var(--status-online)',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 600
                        }}
                      >
                        <Check size={10} /> Saved
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: 'rgba(255, 71, 87, 0.1)',
                          color: 'var(--status-offline)',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 600
                        }}
                      >
                        <XCircle size={10} /> Rejected
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
