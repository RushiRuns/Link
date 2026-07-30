import { useEffect, useRef, useState } from 'react';
import { LinkGroup, LinkIdentity } from '../../types/ipc';
import { useGroupsStore } from '../../stores/groups.store';
import { usePeersStore } from '../../stores/peers.store';
import { useAppStore } from '../../stores/app.store';
import { MessageBubble } from '../conversations/MessageBubble';
import { MessageInput } from '../conversations/MessageInput';
import { Users, Shield, X, Pencil, Trash2, UserPlus } from 'lucide-react';

interface GroupViewProps {
  group: LinkGroup;
}

export function GroupView({ group }: GroupViewProps) {
  const { sendGroupMessage, renameGroup, deleteGroup, addMembersToGroup, removeMemberFromGroup } = useGroupsStore();
  const { selectGroup } = useAppStore();
  const { peers } = usePeersStore();
  const [localIdentity, setLocalIdentity] = useState<LinkIdentity | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedPeersToAdd, setSelectedPeersToAdd] = useState<string[]>([]);

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
            groupMessages.map((msg, i) => (
              <MessageBubble
                key={msg.id || `msg-${i}`}
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
            <span>Details</span>
            <X 
              size={14} 
              style={{ cursor: 'pointer' }} 
              onClick={() => setIsSidebarOpen(false)}
            />
          </div>

          {group.creatorId === localIdentity?.deviceId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <div style={{ fontSize: 'var(--font-size-meta)', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                Options
              </div>
              
              {!isRenaming && !isAddingMember ? (
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 'var(--font-size-body)', padding: 'var(--space-1) 0' }} 
                  onClick={() => {
                    setRenameInput(group.name);
                    setIsRenaming(true);
                    setIsConfirmingDelete(false);
                  }}
                >
                   <Pencil size={14} /> Rename Group
                </div>
              ) : isRenaming ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-2) 0' }}>
                  <input 
                    autoFocus
                    style={{ padding: 'var(--space-2)', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (renameInput.trim() !== '' && renameInput !== group.name) {
                          renameGroup(group.id, renameInput.trim());
                        }
                        setIsRenaming(false);
                      } else if (e.key === 'Escape') {
                        setIsRenaming(false);
                      }
                    }}
                  />
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button 
                      style={{ flex: 1, padding: '4px 8px', fontSize: 'var(--font-size-meta)', cursor: 'pointer', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px' }}
                      onClick={() => {
                        if (renameInput.trim() !== '' && renameInput !== group.name) {
                          renameGroup(group.id, renameInput.trim());
                        }
                        setIsRenaming(false);
                      }}
                    >Save</button>
                    <button 
                      style={{ flex: 1, padding: '4px 8px', fontSize: 'var(--font-size-meta)', cursor: 'pointer', backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                      onClick={() => setIsRenaming(false)}
                    >Cancel</button>
                  </div>
                </div>
              ) : null}

              {!isAddingMember && !isRenaming && !isConfirmingDelete ? (
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 'var(--font-size-body)', padding: 'var(--space-1) 0' }} 
                  onClick={() => {
                    setIsAddingMember(true);
                  }}
                >
                   <UserPlus size={14} /> Add Member
                </div>
              ) : isAddingMember ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-2) 0' }}>
                  <span style={{ fontSize: 'var(--font-size-meta)' }}>Select Peers</span>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {Array.from(peers.values())
                      .filter(p => p.status === 'online' && !group.members.some(m => m.peerId === p.id))
                      .map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-meta)', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedPeersToAdd.includes(p.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedPeersToAdd([...selectedPeersToAdd, p.id]);
                              else setSelectedPeersToAdd(selectedPeersToAdd.filter(id => id !== p.id));
                            }}
                          />
                          {p.displayName}
                        </label>
                      ))}
                    {Array.from(peers.values()).filter(p => p.status === 'online' && !group.members.some(m => m.peerId === p.id)).length === 0 && (
                      <span style={{ fontSize: 'var(--font-size-meta)', color: 'var(--text-secondary)' }}>No other online peers available.</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button 
                      style={{ flex: 1, padding: '4px 8px', fontSize: 'var(--font-size-meta)', cursor: 'pointer', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px' }}
                      disabled={selectedPeersToAdd.length === 0}
                      onClick={() => {
                        addMembersToGroup(group.id, selectedPeersToAdd);
                        setIsAddingMember(false);
                        setSelectedPeersToAdd([]);
                      }}
                    >Add</button>
                    <button 
                      style={{ flex: 1, padding: '4px 8px', fontSize: 'var(--font-size-meta)', cursor: 'pointer', backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                      onClick={() => {
                        setIsAddingMember(false);
                        setSelectedPeersToAdd([]);
                      }}
                    >Cancel</button>
                  </div>
                </div>
              ) : null}

              {!isConfirmingDelete && !isAddingMember && !isRenaming ? (
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', color: 'var(--status-error)', fontSize: 'var(--font-size-body)', padding: 'var(--space-1) 0' }} 
                  onClick={() => {
                    setIsConfirmingDelete(true);
                    setIsRenaming(false);
                  }}
                >
                   <Trash2 size={14} /> Delete Group
                </div>
              ) : isConfirmingDelete ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', border: '1px solid var(--status-error)', borderRadius: '4px', padding: 'var(--space-3)' }}>
                  <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--text-primary)' }}>Are you sure?</span>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button 
                      style={{ flex: 1, padding: '4px 8px', fontSize: 'var(--font-size-meta)', cursor: 'pointer', backgroundColor: 'var(--status-error)', color: 'white', border: 'none', borderRadius: '4px' }}
                      onClick={() => {
                        deleteGroup(group.id);
                        selectGroup(null);
                      }}
                    >Yes, Delete</button>
                    <button 
                      style={{ flex: 1, padding: '4px 8px', fontSize: 'var(--font-size-meta)', cursor: 'pointer', backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                      onClick={() => setIsConfirmingDelete(false)}
                    >Cancel</button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ fontSize: 'var(--font-size-meta)', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Members ({group.members.length})
            </div>
          {group.members.map((m, i) => {
            const isSelf = m.peerId === localIdentity?.deviceId;
            const runtimePeer = peers.get(m.peerId);
            const isOnline = isSelf || runtimePeer?.status === 'online';

            return (
              <div
                key={m.peerId ? `${m.peerId}-${i}` : `member-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-2)',
                  fontSize: 'var(--font-size-body)',
                  color: 'var(--text-primary)',
                  padding: '2px 0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
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
                {group.creatorId === localIdentity?.deviceId && !isSelf && (
                  <span title="Remove member" style={{ display: 'flex', alignItems: 'center' }}>
                    <X 
                      size={14} 
                      style={{ cursor: 'pointer', color: 'var(--text-secondary)', opacity: 0.6 }} 
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove ${m.displayName} from the group?`)) {
                          removeMemberFromGroup(group.id, m.peerId!);
                        }
                      }} 
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--status-error)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    />
                  </span>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
