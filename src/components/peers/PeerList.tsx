import { useEffect, useState } from 'react';
import { usePeersStore } from '../../stores/peers.store';
import { useAppStore } from '../../stores/app.store';
import { PeerItem } from './PeerItem';
import { Users, AlertTriangle } from 'lucide-react';

export function PeerList() {
  const { peers, loadKnownPeers, initListeners } = usePeersStore();
  const { selectedPeerId, selectPeer } = useAppStore();
  const [noPeersFound, setNoPeersFound] = useState(false);

  useEffect(() => {
    loadKnownPeers();
    const cleanupListeners = initListeners();

    let cleanNoPeers: (() => void) | undefined;
    if (window.link?.peers?.onNoPeersFound) {
      cleanNoPeers = window.link.peers.onNoPeersFound(() => {
        setNoPeersFound(true);
      });
    }

    return () => {
      cleanupListeners();
      cleanNoPeers?.();
    };
  }, [loadKnownPeers, initListeners]);

  const peerList = Array.from(peers.values());
  const onlinePeers = peerList.filter((p) => p.status === 'online' || p.status === 'version_mismatch');
  const offlinePeers = peerList.filter((p) => p.status === 'offline');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-3)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          paddingBottom: 'var(--space-3)',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: 'var(--space-3)'
        }}
      >
        <Users size={18} color="var(--accent-primary)" />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Teammates</span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.75rem',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent-primary)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            fontWeight: 600
          }}
        >
          {onlinePeers.length} online
        </span>
      </div>

      {noPeersFound && onlinePeers.length === 0 && (
        <div
          style={{
            padding: 'var(--space-3)',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            fontSize: '0.78rem',
            color: 'var(--status-warning)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)'
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>No peers found — your network may block peer discovery (AP isolation / multicast drop).</span>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {onlinePeers.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '4px',
                paddingLeft: 'var(--space-2)'
              }}
            >
              Online ({onlinePeers.length})
            </div>
            {onlinePeers.map((peer) => (
              <PeerItem
                key={peer.id}
                peer={peer}
                isSelected={selectedPeerId === peer.id}
                onSelect={(p) => selectPeer(p.id)}
              />
            ))}
          </div>
        )}

        {offlinePeers.length > 0 && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '4px',
                paddingLeft: 'var(--space-2)'
              }}
            >
              Offline ({offlinePeers.length})
            </div>
            {offlinePeers.map((peer) => (
              <PeerItem
                key={peer.id}
                peer={peer}
                isSelected={selectedPeerId === peer.id}
                onSelect={(p) => selectPeer(p.id)}
              />
            ))}
          </div>
        )}

        {peerList.length === 0 && !noPeersFound && (
          <div
            style={{
              padding: 'var(--space-4)',
              textAlign: 'center',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              fontStyle: 'italic'
            }}
          >
            Searching LAN for teammates...
          </div>
        )}
      </div>
    </div>
  );
}
