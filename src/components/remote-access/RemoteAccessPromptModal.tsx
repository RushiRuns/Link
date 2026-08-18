import { useRemoteAccessStore } from '../../stores/remote-access.store';
import { X, Eye, MonitorPlay } from 'lucide-react';

export function RemoteAccessPromptModal() {
  const incomingRequest = useRemoteAccessStore((s) => s.incomingRequest);
  const startScreenSelection = useRemoteAccessStore((s) => s.startScreenSelection);
  const denyRequest = useRemoteAccessStore((s) => s.denyRequest);

  if (!incomingRequest) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1210, // Must be above CallScreen (1200) and below ScreenPicker (9999)
        padding: 'var(--space-6)'
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-card)'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Remote Access Request</h2>
          <button
            onClick={() => denyRequest()}
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

        <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div style={{ textAlign: 'center' }}>
            <div 
              style={{ 
                width: 64, 
                height: 64, 
                borderRadius: '50%', 
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 600,
                margin: '0 auto var(--space-4)'
              }}
            >
              {incomingRequest.peerName.substring(0, 2).toUpperCase()}
            </div>
            <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              <strong>{incomingRequest.peerName}</strong> is requesting to view or control your screen.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <button
              onClick={() => startScreenSelection('view-only')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                width: '100%',
                padding: 'var(--space-4)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
              }}
            >
              <div style={{ padding: 'var(--space-2)', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}>
                <Eye size={20} color="var(--accent-primary)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>Accept View-Only</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>They can see your screen, but cannot control your mouse or keyboard.</div>
              </div>
            </button>

            <button
              onClick={() => startScreenSelection('full-control')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                width: '100%',
                padding: 'var(--space-4)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--status-error)';
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
              }}
            >
              <div style={{ padding: 'var(--space-2)', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}>
                <MonitorPlay size={20} color="var(--status-error)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '2px', color: 'var(--status-error)' }}>Accept Full Control</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>They will have full access to control your mouse and keyboard.</div>
              </div>
            </button>
            
            <button
              onClick={() => denyRequest()}
              style={{
                marginTop: 'var(--space-2)',
                padding: 'var(--space-3)',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Deny Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
