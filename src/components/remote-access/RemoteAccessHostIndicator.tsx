import { useRemoteAccessStore } from '../../stores/remote-access.store';
import { useRemoteAccessWebRTC } from '../../hooks/useRemoteAccessWebRTC';
import { ScreenShareOff, ShieldAlert } from 'lucide-react';

export function RemoteAccessHostIndicator() {
  const activeSession = useRemoteAccessStore((s) => s.activeSession);
  const endSession = useRemoteAccessStore((s) => s.endSession);
  const hostScreenSourceId = useRemoteAccessStore((s) => s.hostScreenSourceId);

  // The hook is initialized immediately when the host indicator mounts (which is right after confirmScreenSelection).
  useRemoteAccessWebRTC({
    sessionId: activeSession?.sessionId || '',
    role: activeSession?.role || 'host',
    permissionMode: activeSession?.permissionMode,
    screenSourceId: hostScreenSourceId || undefined
  });

  if (!activeSession || activeSession.role !== 'host') return null;

  const isFullControl = activeSession.permissionMode === 'full-control';

  return (
    <div
      style={{
        position: 'fixed',
        top: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-3) var(--space-4)',
        backgroundColor: 'var(--surface-color)',
        border: `2px solid ${isFullControl ? 'var(--status-error)' : 'var(--accent-primary)'}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5)',
        zIndex: 1220, // Always on top
        color: 'var(--text-primary)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div 
          style={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%', 
            backgroundColor: isFullControl ? 'var(--status-error)' : 'var(--accent-primary)',
            boxShadow: `0 0 8px ${isFullControl ? 'var(--status-error)' : 'var(--accent-primary)'}`
          }} 
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
            Sharing screen with {activeSession.peerName}
          </span>
          {isFullControl && (
            <span style={{ fontSize: '0.8rem', color: 'var(--status-error)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <ShieldAlert size={12} /> They have full mouse and keyboard control
            </span>
          )}
        </div>
      </div>

      <div style={{ width: 1, height: 32, backgroundColor: 'var(--border-color)', margin: '0 var(--space-2)' }} />

      <button
        onClick={() => endSession()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: '8px 16px',
          backgroundColor: 'var(--status-error)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.9rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'filter 0.2s'
        }}
        onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
        onMouseOut={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
      >
        <ScreenShareOff size={18} /> Stop Sharing
      </button>
    </div>
  );
}
