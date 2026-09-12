import { useState, useEffect } from 'react';
import { MonitorUp, AlertTriangle } from 'lucide-react';
import { useFileTransferStore } from '../../stores/file-transfer.store';
import { toast } from '../../stores/toast.store';

interface RemoteAccessButtonProps {
  peerId: string;
  disabled?: boolean;
}

export function RemoteAccessButton({ peerId, disabled }: RemoteAccessButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [showTransferWarning, setShowTransferWarning] = useState(false);
  const transfers = useFileTransferStore(s => s.transfers);

  useEffect(() => {
    if (window.link?.remoteAccess) {
      const cleanups = [
        window.link.remoteAccess.onSessionEnded(() => setIsPending(false)),
        window.link.remoteAccess.onSessionAccepted(() => setIsPending(false))
      ];
      return () => cleanups.forEach(c => c());
    }
  }, []);

  const sendAccessRequest = async () => {
    if (window.link?.remoteAccess) {
      setIsPending(true);
      try {
        await window.link.remoteAccess.requestAccess(peerId);
        toast.info('Remote access request sent');
      } catch (err) {
        console.error('Failed to request remote access:', err);
        toast.error('Failed to request remote access');
        setIsPending(false);
      }
    }
  };

  const handleClick = async () => {
    // File transfer warning check
    const hasActiveTransfer = Array.from(transfers.values()).some(
      t => t.status === 'transferring'
    );
    
    if (hasActiveTransfer) {
      setShowTransferWarning(true);
      return;
    }

    await sendAccessRequest();
  };

  return (
    <>
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

      {/* In-app warning modal when file transfer is active */}
      {showTransferWarning && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)'
          }}
        >
          <div
            style={{
              width: 400,
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
              padding: 'var(--space-5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255, 159, 10, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <AlertTriangle size={20} color="var(--status-warning)" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Active File Transfer
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Network latency warning
                </p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              A file transfer is currently active. Starting a remote desktop session now may experience high latency or frame drops due to LAN network saturation.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                onClick={() => setShowTransferWarning(false)}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowTransferWarning(false);
                  sendAccessRequest();
                }}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 500
                }}
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
