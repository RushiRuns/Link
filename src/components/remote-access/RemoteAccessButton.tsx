import { useState } from 'react';
import { MonitorUp } from 'lucide-react';
import { useFileTransferStore } from '../../stores/file-transfer.store';

interface RemoteAccessButtonProps {
  peerId: string;
  disabled?: boolean;
}

export function RemoteAccessButton({ peerId, disabled }: RemoteAccessButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const transfers = useFileTransferStore(s => s.transfers);

  const handleClick = async () => {
    // File transfer warning check
    const hasActiveTransfer = Array.from(transfers.values()).some(
      t => t.status === 'transferring'
    );
    
    if (hasActiveTransfer) {
      const confirm = window.confirm(
        "A file transfer is currently active. Starting a remote access session now may experience high latency due to network saturation. Continue?"
      );
      if (!confirm) return;
    }

    if (window.link?.remoteAccess) {
      setIsPending(true);
      try {
        await window.link.remoteAccess.requestAccess(peerId);
        // We leave isPending true, it will clear if the session ends or is denied via IPC listeners
      } catch (err) {
        console.error('Failed to request remote access:', err);
        setIsPending(false);
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isPending}
      title={disabled ? "Cannot start remote access during an active call" : isPending ? "Waiting for peer to accept..." : "Request Remote Access"}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        color: disabled ? 'var(--text-muted)' : isPending ? 'var(--accent-primary)' : 'var(--text-primary)',
        cursor: disabled ? 'not-allowed' : isPending ? 'wait' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all var(--transition-fast)'
      }}
      onMouseOver={(e) => {
        if (!disabled && !isPending) {
          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          e.currentTarget.style.color = 'var(--accent-primary)';
        }
      }}
      onMouseOut={(e) => {
        if (!disabled && !isPending) {
          e.currentTarget.style.backgroundColor = 'var(--bg-card)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
    >
      <MonitorUp size={15} strokeWidth={1.5} className={isPending ? 'lucide-pulse' : ''} />
      {isPending && (
        <style>{`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.4; }
            100% { opacity: 1; }
          }
          .lucide-pulse {
            animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>
      )}
    </button>
  );
}
