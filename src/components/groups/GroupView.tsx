import { useEffect, useRef, useState } from 'react';
import { LinkGroup, LinkIdentity } from '../../types/ipc';
import { useGroupsStore } from '../../stores/groups.store';
import { usePeersStore } from '../../stores/peers.store';
import { MessageBubble } from '../conversations/MessageBubble';
import { MessageInput } from '../conversations/MessageInput';
import { Users, Shield } from 'lucide-react';

interface GroupViewProps {
  group: LinkGroup;
}

export function GroupView({ group }: GroupViewProps) {
  const { sendGroupMessage, initListeners } = useGroupsStore();
  const { peers } = usePeersStore();
  const [localIdentity, setLocalIdentity] = useState<LinkIdentity | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.link?.identity) {
      window.link.identity.getIdentity().then(setLocalIdentity).catch(console.error);
    }
  }, []);

  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

  const groupMessages = group.messages || [];

  // Auto scroll to bottom when new group messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [groupMessages.length]);

  const handleSend = (text: string) => {
    sendGroupMessage(group.id, text);
  };

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Group Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-3) var(--space-5)',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-sidebar)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Users size={20} color="var(--accent-primary)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{group.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {group.members.length} members • P2P Mesh Group
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--status-online)' }}>
            <Shield size={14} color="var(--status-online)" />
            <span>Encrypted Mesh</span>
          </div>
        </div>

        {/* Message List */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--space-4) var(--space-5)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {groupMessages.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                gap: 'var(--space-2)'
              }}
            >
              <Users size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
              <div>Group "{group.name}" initialized</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Send a message to all members in the mesh</div>
            </div>
          ) : (
            groupMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isSelf={msg.senderId === localIdentity?.deviceId}
                showSenderLabel={true}
              />
            ))
          )}
        </div>

        {/* Input Footer */}
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--border-color)' }}>
          <MessageInput onSend={handleSend} placeholder={`Message #${group.name}...`} />
        </div>
      </div>

      {/* Group Member Sidebar */}
      <div
        style={{
          width: 200,
          borderLeft: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-sidebar)',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)'
        }}
      >
        <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Members ({group.members.length})
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {group.members.map((m) => {
            const isSelf = m.peerId === localIdentity?.deviceId;
            const runtimePeer = peers.get(m.peerId);
            const isOnline = isSelf || runtimePeer?.status === 'online';

            return (
              <div
                key={m.peerId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)'
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: isOnline ? 'var(--status-online)' : 'var(--status-offline)',
                    flexShrink: 0
                  }}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.displayName} {isSelf && '(You)'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
