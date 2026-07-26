import { PeerStatus } from '../../types/ipc';

interface StatusBadgeProps {
  status: PeerStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'version_mismatch') {
    return (
      <span
        title="Update Link to connect — version mismatch"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.7rem',
          fontWeight: 600,
          color: 'var(--status-warning)',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)'
        }}
      >
        <span>⚠️</span> Mismatch
      </span>
    );
  }

  const isOnline = status === 'online';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.75rem',
        color: isOnline ? 'var(--status-online)' : 'var(--text-muted)'
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: isOnline ? 'var(--status-online)' : 'var(--status-offline)'
        }}
      />
      {isOnline ? 'Online' : 'Offline'}
    </span>
  );
}
