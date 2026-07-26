import { LinkPeer } from '../../types/ipc';
import { StatusBadge } from './StatusBadge';
import { X, User, Key, Activity, Clock } from 'lucide-react';

interface PeerProfileProps {
  peer: LinkPeer;
  onClose: () => void;
}

export function PeerProfile({ peer, onClose }: PeerProfileProps) {
  const lastSeenText = peer.lastSeen ? new Date(peer.lastSeen).toLocaleString() : 'Just now';

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
        zIndex: 1350,
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
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <User size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Teammate Profile</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: 'var(--accent-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <User size={28} color="var(--accent-primary)" />
            </div>

            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{peer.displayName}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <StatusBadge status={peer.status} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {peer.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-sidebar)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)'
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Key size={13} /> PUBLIC KEY FINGERPRINT (SHA-256)
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                {peer.publicKeyFingerprint}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} /> LAST SEEN PRESENCE
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                {lastSeenText}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={13} /> CONNECTION SECURITY
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--status-online)', marginTop: '2px', fontWeight: 500 }}>
                Noise_XX Curve25519 Direct Encrypted Socket
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
