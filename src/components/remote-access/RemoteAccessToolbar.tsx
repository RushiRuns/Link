import { Activity, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { PermissionMode } from '../../types/remote-access';

interface RemoteAccessToolbarProps {
  permissionMode: PermissionMode;
  rtt: number;
  bitrate: number;
  onDisconnect: () => void;
}

export function RemoteAccessToolbar({ permissionMode, rtt, bitrate, onDisconnect }: RemoteAccessToolbarProps) {
  const isFullControl = permissionMode === 'full-control';

  return (
    <div
      style={{
        position: 'absolute',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-2) var(--space-4)',
        backgroundColor: 'rgba(20, 22, 27, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-full)',
        color: '#fff',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}
    >
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--space-2)',
          paddingRight: 'var(--space-4)',
          borderRight: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        {isFullControl ? (
          <ShieldAlert size={16} color="var(--status-error)" />
        ) : (
          <ShieldCheck size={16} color="var(--accent-primary)" />
        )}
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isFullControl ? 'var(--status-error)' : 'var(--accent-primary)' }}>
          {isFullControl ? 'Full Control' : 'View Only'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', paddingRight: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }} title="Network Latency (RTT)">
          <Activity size={14} />
          <span style={{ width: 45 }}>{rtt > 0 ? `${rtt}ms` : '--'}</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', width: 60 }} title="Video Bitrate">
          {bitrate > 0 ? `${bitrate} kbps` : '--'}
        </div>
      </div>

      <button
        onClick={onDisconnect}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: '6px 12px',
          backgroundColor: 'var(--status-error)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'filter 0.2s'
        }}
        onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
        onMouseOut={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
      >
        <XCircle size={16} /> Disconnect
      </button>
    </div>
  );
}
