import { useCallsStore } from '../../stores/calls.store';
import { Phone, Video, PhoneOff } from 'lucide-react';

export function IncomingCallModal() {
  const { incomingCall, setActiveCall, setIncomingCall, endCall } = useCallsStore();

  if (!incomingCall) return null;

  const handleAccept = () => {
    setActiveCall({
      ...incomingCall,
      status: 'connected'
    });
    setIncomingCall(null);
  };

  const handleDecline = () => {
    endCall();
  };

  const isVideo = incomingCall.mediaType === 'video';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        backdropFilter: 'blur(6px)'
      }}
    >
      <div
        style={{
          width: 380,
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: isVideo ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-4)'
          }}
        >
          {isVideo ? (
            <Video size={30} color="var(--accent-primary)" />
          ) : (
            <Phone size={30} color="var(--status-online)" />
          )}
        </div>

        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
          Incoming {isVideo ? 'Video' : 'Voice'} Call
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          {incomingCall.peerName || 'Teammate'} is calling you over LAN
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-4)', width: '100%' }}>
          <button
            onClick={handleDecline}
            style={{
              flex: 1,
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--status-error)',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <PhoneOff size={18} /> Decline
          </button>

          <button
            onClick={handleAccept}
            style={{
              flex: 1,
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--status-online)',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {isVideo ? <Video size={18} /> : <Phone size={18} />} Accept
          </button>
        </div>
      </div>
    </div>
  );
}
