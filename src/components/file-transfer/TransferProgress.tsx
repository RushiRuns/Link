import { LinkFileTransfer } from '../../types/ipc';
import { FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface TransferProgressProps {
  transfer: LinkFileTransfer;
  isSelf?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function TransferProgress({ transfer, isSelf }: TransferProgressProps) {
  const isOutgoing = isSelf ?? (transfer.direction === 'outgoing');
  const percent = transfer.fileSizeBytes > 0
    ? Math.min(100, Math.round((transfer.bytesTransferred / transfer.fileSizeBytes) * 100))
    : 0;

  const isComplete = transfer.status === 'completed';
  const isFailed = transfer.status === 'failed' || transfer.status === 'declined';

  return (
    <div
      style={{
        alignSelf: isOutgoing ? 'flex-end' : 'flex-start',
        backgroundColor: isOutgoing ? 'var(--bg-card)' : 'var(--bg-sidebar)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        padding: 'var(--space-3) var(--space-4)',
        margin: 'var(--space-2) 0',
        maxWidth: 380,
        width: '100%',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-md)',
            backgroundColor: isComplete
              ? 'rgba(16, 185, 129, 0.15)'
              : isFailed
              ? 'rgba(239, 68, 68, 0.15)'
              : 'var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {isComplete ? (
            <CheckCircle2 size={18} color="var(--status-online)" />
          ) : isFailed ? (
            <AlertCircle size={18} color="var(--status-error)" />
          ) : (
            <FileText size={18} color="var(--accent-primary)" />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {transfer.fileName}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {formatBytes(transfer.bytesTransferred)} / {formatBytes(transfer.fileSizeBytes)} ({percent}%)
          </div>
        </div>
      </div>

      {/* Progress Bar Track */}
      {!isComplete && !isFailed && (
        <div
          style={{
            width: '100%',
            height: 6,
            backgroundColor: 'var(--bg-input)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              backgroundColor: 'var(--accent-primary)',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.2s ease'
            }}
          />
        </div>
      )}
    </div>
  );
}
