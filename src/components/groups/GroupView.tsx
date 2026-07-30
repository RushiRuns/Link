import { useEffect, useRef, useState } from 'react';
import { LinkGroup, LinkIdentity } from '../../types/ipc';
import { useGroupsStore } from '../../stores/groups.store';
import { usePeersStore } from '../../stores/peers.store';
import { MessageBubble } from '../conversations/MessageBubble';
import { MessageInput } from '../conversations/MessageInput';
import { Users, Shield, X } from 'lucide-react';

interface GroupViewProps {
  group: LinkGroup;
}

export function GroupView({ group }: GroupViewProps) {
  const { sendGroupMessage } = useGroupsStore();
  const { peers } = usePeersStore();
  const [localIdentity, setLocalIdentity] = useState<LinkIdentity | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (window.link?.identity) {
      window.link.identity.getIdentity().then(setLocalIdentity).catch(console.error);
    }
  }, []);



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
            backgroundColor: 'var(--bg-sidebar)',
            cursor: 'pointer'
          }}
          onClick={() => setIsSidebarOpen(true)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Users size={18} strokeWidth={1.5} color="var(--accent-primary)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-header)' }}>{group.name}</div>
              <div style={{ fontSize: 'var(--font-size-meta)', color: 'var(--text-secondary)' }}>
                {group.members.length} members • P2P Mesh Group
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-meta)', color: 'var(--status-online)' }}>
            <Shield size={14} strokeWidth={1.5} color="var(--status-online)" />
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
                color: 'var(--text-secondary)',
                fontSize: 'var(--font-size-body)',
                gap: 'var(--space-2)'
              }}
            >
              <Users size={32} strokeWidth={1.5} color="var(--text-secondary)" style={{ opacity: 0.5 }} />
              <div>Group "{group.name}" initialized</div>
              <div style={{ fontSize: 'var(--font-size-meta)', opacity: 0.8 }}>Send a message to all members in the mesh</div>
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
      {isSidebarOpen && (
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
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontSize: 'var(--font-size-meta)', 
            fontWeight: 600, 
            textTransform: 'uppercase', 
            color: 'var(--text-secondary)' 
          }}>
            <span>Members ({group.members.length})</span>
            <X 
              size={14} 
              style={{ cursor: 'pointer' }} 
              onClick={() => setIsSidebarOpen(false)}
            />
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
                  fontSize: 'var(--font-size-body)',
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
      )}
    </div>
  );
}
