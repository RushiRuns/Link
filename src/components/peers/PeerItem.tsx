import { LinkPeer } from '../../types/ipc';
import { StatusBadge } from './StatusBadge';
import { User } from 'lucide-react';

interface PeerItemProps {
  peer: LinkPeer;
  isSelected?: boolean;
  onSelect?: (peer: LinkPeer) => void;
}

export function PeerItem({ peer, isSelected, onSelect }: PeerItemProps) {
  return (
    <div
      onClick={() => onSelect?.(peer)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <User size={18} color="var(--text-secondary)" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            style={{
              fontWeight: 500,
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {peer.displayName}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {peer.publicKeyFingerprint ? peer.publicKeyFingerprint.substring(0, 9) : peer.id.substring(0, 8)}
          </span>
        </div>
      </div>

      <StatusBadge status={peer.status} />
    </div>
  );
}
