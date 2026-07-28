import { useEffect, useState } from 'react';
import { usePeersStore } from '../../stores/peers.store';
import { useGroupsStore } from '../../stores/groups.store';
import { useAppStore } from '../../stores/app.store';
import { PeerItem } from './PeerItem';
import { GroupCreate } from '../groups/GroupCreate';
import { LinkIdentity } from '../../types/ipc';
import { Users, AlertTriangle, Plus, MessageSquare, Settings, User, Download } from 'lucide-react';
import { SessionDownloads } from '../file-transfer/SessionDownloads';

interface PeerListProps {
  onOpenSettings?: () => void;
}

export function PeerList({ onOpenSettings }: PeerListProps) {
  const { peers, loadKnownPeers } = usePeersStore();
  const { groups } = useGroupsStore();
  const { selectedPeerId, selectedGroupId, selectPeer, selectGroup } = useAppStore();
  const [noPeersFound, setNoPeersFound] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [localIdentity, setLocalIdentity] = useState<LinkIdentity | null>(null);

  useEffect(() => {
    loadKnownPeers();


    if (window.link?.identity) {
      window.link.identity.getIdentity().then(setLocalIdentity).catch(console.error);
    }

    let cleanNoPeers: (() => void) | undefined;
    if (window.link?.peers?.onNoPeersFound) {
      cleanNoPeers = window.link.peers.onNoPeersFound(() => {
        setNoPeersFound(true);
      });
    }

    return () => {
      cleanNoPeers?.();
    };
  }, [loadKnownPeers]);

  const peerList = Array.from(peers.values());
  const groupList = Array.from(groups.values());
  const onlinePeers = peerList.filter((p) => p.status === 'online' || p.status === 'version_mismatch');
  const offlinePeers = peerList.filter((p) => p.status === 'offline');

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-3)', position: 'relative' }}>
        {/* Header with New Group button */}
        <div
          data-nodrag
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 'var(--space-3)',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: 'var(--space-3)',
            paddingTop: 'var(--space-2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Users size={16} strokeWidth={1.5} color="var(--text-secondary)" />
            <span style={{ fontWeight: 600, fontSize: 'var(--font-size-header)' }}>Teammates</span>
          </div>

          <button
            onClick={() => setShowCreateGroupModal(true)}
            title="Create Group Chat"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-meta)',
              fontWeight: 500,
              transition: 'background-color var(--transition-fast)'
            }}
          >
            <Plus size={13} strokeWidth={1.5} /> New Group
          </button>
        </div>

        {noPeersFound && onlinePeers.length === 0 && (
          <div
            data-nodrag
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'rgba(255, 159, 10, 0.12)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 159, 10, 0.3)',
              fontSize: 'var(--font-size-meta)',
              color: 'var(--status-warning)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-3)'
            }}
          >
            <AlertTriangle size={15} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>No peers found — your network may block peer discovery.</span>
          </div>
        )}

        <div data-nodrag style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Groups Section */}
          {groupList.length > 0 && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <div
                style={{
                  fontSize: 'var(--font-size-meta)',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                  paddingLeft: 'var(--space-2)'
                }}
              >
                Groups ({groupList.length})
              </div>
              {groupList.map((g) => {
                const isSelected = selectedGroupId === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => selectGroup(g.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'background-color var(--transition-fast)'
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--accent-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <MessageSquare size={16} strokeWidth={1.5} color="var(--accent-primary)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontWeight: 500, fontSize: 'var(--font-size-body)', color: 'var(--text-primary)' }}>
                        {g.name}
                      </span>
                      <span style={{ fontSize: 'var(--font-size-meta)', color: 'var(--text-secondary)' }}>
                        {g.members.length} members
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Online Peers Section */}
          {onlinePeers.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 'var(--font-size-meta)',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
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
                  localIdentity={localIdentity}
                />
              ))}
            </div>
          )}

          {/* Offline Peers Section */}
          {offlinePeers.length > 0 && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div
                style={{
                  fontSize: 'var(--font-size-meta)',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
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
                  localIdentity={localIdentity}
                />
              ))}
            </div>
          )}

          {peerList.length === 0 && groupList.length === 0 && !noPeersFound && (
            <div
              style={{
                padding: 'var(--space-4)',
                textAlign: 'center',
                fontSize: 'var(--font-size-body)',
                color: 'var(--text-secondary)',
                fontStyle: 'italic'
              }}
            >
              Searching LAN for teammates...
            </div>
          )}
        </div>

        {/* User Identity Footer Bar with Settings Button */}
        <div
          data-nodrag
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--border-color)',
            marginTop: 'var(--space-2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                flexShrink: 0
              }}
            >
              <User size={14} strokeWidth={1.5} color="var(--text-secondary)" />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: 'var(--status-online)',
                  border: '1px solid var(--bg-sidebar)'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                style={{
                  fontWeight: 500,
                  fontSize: 'var(--font-size-body)',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {localIdentity?.displayName || 'My Device'}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--status-online)' }}>Online</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setShowDownloads(!showDownloads)}
              title="Session Downloads"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: showDownloads ? 'var(--bg-card-hover)' : 'transparent',
                color: showDownloads ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'background-color var(--transition-fast), color var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = showDownloads ? 'var(--bg-card-hover)' : 'transparent';
                e.currentTarget.style.color = showDownloads ? 'var(--text-primary)' : 'var(--text-secondary)';
              }}
            >
              <Download size={16} strokeWidth={1.5} />
            </button>

            <button
              onClick={onOpenSettings}
              title="Settings & Preferences"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'background-color var(--transition-fast), color var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Settings size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {showCreateGroupModal && (
        <GroupCreate onClose={() => setShowCreateGroupModal(false)} />
      )}
      {showDownloads && (
        <SessionDownloads onClose={() => setShowDownloads(false)} />
      )}
    </>
  );
}
