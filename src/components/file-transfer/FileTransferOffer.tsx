import { LinkFileTransfer } from '../../types/ipc';
import { useFileTransferStore } from '../../stores/file-transfer.store';
import { FileText, Download, X } from 'lucide-react';

interface FileTransferOfferProps {
  offer: LinkFileTransfer;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function FileTransferOffer({ offer }: FileTransferOfferProps) {
  const { respondToOffer } = useFileTransferStore();

  const handleAccept = () => {
    respondToOffer(offer.id, true);
  };

  const handleDecline = () => {
    respondToOffer(offer.id, false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        style={{
          width: 400,
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          padding: 'var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: 'var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-3)'
          }}
        >
          <FileText size={26} color="var(--accent-primary)" />
        </div>

        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
          Incoming File Transfer
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          A teammate wants to send you a file over LAN
        </p>

        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-sidebar)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            textAlign: 'left',
            marginBottom: 'var(--space-5)'
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
            {offer.fileName}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Size: {formatBytes(offer.fileSizeBytes)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', width: '100%' }}>
          <button
            onClick={handleDecline}
            style={{
              flex: 1,
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <X size={16} /> Decline
          </button>

          <button
            onClick={handleAccept}
            style={{
              flex: 1,
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Download size={16} /> Accept File
          </button>
        </div>
      </div>
    </div>
  );
}
