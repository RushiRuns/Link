import { LinkPeer, LinkIdentity } from '../../types/ipc';
import { useConversationsStore } from '../../stores/conversations.store';
import { User } from 'lucide-react';

interface PeerItemProps {
  peer: LinkPeer;
  isSelected?: boolean;
  onSelect?: (peer: LinkPeer) => void;
  localIdentity?: LinkIdentity | null;
}

export function PeerItem({ peer, isSelected, onSelect, localIdentity }: PeerItemProps) {
  const { unreadCounts } = useConversationsStore();
  
  const conversationId = localIdentity
    ? [localIdentity.deviceId, peer.id].sort().join('_')
    : 'default';
    
  const unreadCount = unreadCounts.get(conversationId) || 0;
  return (
    <div
      onClick={() => onSelect?.(peer)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
        cursor: 'pointer',
        transition: 'background-color var(--transition-fast)',
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
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <User size={16} strokeWidth={1.5} color="var(--text-secondary)" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            style={{
              fontWeight: 500,
              fontSize: 'var(--font-size-body)',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {peer.displayName}
          </span>
          <span style={{ fontSize: 'var(--font-size-meta)', color: peer.status === 'online' ? 'var(--status-online)' : 'var(--text-secondary)' }}>
            {peer.status.charAt(0).toUpperCase() + peer.status.slice(1).replace('_', ' ')}
          </span>
        </div>
      </div>

      {unreadCount > 0 && (
        <div
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '10px',
            minWidth: '20px',
            textAlign: 'center'
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </div>
  );
}
