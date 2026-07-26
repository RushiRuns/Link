import { useState } from 'react';
import { usePeersStore } from '../../stores/peers.store';
import { useGroupsStore } from '../../stores/groups.store';
import { useAppStore } from '../../stores/app.store';
import { X, Users, Check } from 'lucide-react';

interface GroupCreateProps {
  onClose: () => void;
}

export function GroupCreate({ onClose }: GroupCreateProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedPeerIds, setSelectedPeerIds] = useState<Set<string>>(new Set());
  const { peers } = usePeersStore();
  const { createGroup } = useGroupsStore();
  const { selectGroup } = useAppStore();

  const peerList = Array.from(peers.values()).filter((p) => p.status === 'online');

  const togglePeer = (peerId: string) => {
    const next = new Set(selectedPeerIds);
    if (next.has(peerId)) {
      next.delete(peerId);
    } else {
      next.add(peerId);
    }
    setSelectedPeerIds(next);
  };

  const handleCreate = async () => {
    const trimmed = groupName.trim();
    if (!trimmed || selectedPeerIds.size === 0) return;

    const group = await createGroup(trimmed, Array.from(selectedPeerIds));
    if (group) {
      selectGroup(group.id);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      <div
        style={{
          width: 420,
          backgroundColor: 'var(--bg-sidebar)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
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
            <Users size={16} strokeWidth={1.5} color="var(--accent-primary)" />
            <h3 style={{ fontSize: 'var(--font-size-title)', fontWeight: 600 }}>Create New Group</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--font-size-meta)',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-1)'
              }}
            >
              GROUP NAME
            </label>
            <input
              type="text"
              placeholder="e.g. Design Team"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-body)',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--font-size-meta)',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-2)'
              }}
            >
              ADD MEMBERS ({selectedPeerIds.size} selected)
            </label>

            <div
              style={{
                maxHeight: 180,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-2)',
                backgroundColor: 'var(--bg-app)'
              }}
            >
              {peerList.length === 0 ? (
                <div style={{ fontSize: 'var(--font-size-meta)', color: 'var(--text-secondary)', textAlign: 'center', padding: 'var(--space-3)' }}>
                  No online teammates available to add
                </div>
              ) : (
                peerList.map((peer) => {
                  const isChecked = selectedPeerIds.has(peer.id);
                  return (
                    <div
                      key={peer.id}
                      onClick={() => togglePeer(peer.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isChecked ? 'var(--accent-light)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color var(--transition-fast)'
                      }}
                    >
                      <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--text-primary)' }}>{peer.displayName}</span>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          border: isChecked ? 'none' : '1px solid var(--border-color)',
                          backgroundColor: isChecked ? 'var(--accent-primary)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff'
                        }}
                      >
                        {isChecked && <Check size={12} strokeWidth={2} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-app)'
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-body)'
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedPeerIds.size === 0}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: !groupName.trim() || selectedPeerIds.size === 0 ? 'var(--bg-card-hover)' : 'var(--accent-primary)',
              color: !groupName.trim() || selectedPeerIds.size === 0 ? 'var(--text-secondary)' : '#ffffff',
              cursor: !groupName.trim() || selectedPeerIds.size === 0 ? 'default' : 'pointer',
              fontSize: 'var(--font-size-body)',
              fontWeight: 500
            }}
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
