import React, { useEffect, useRef, useState } from 'react';
import { LinkGroup, LinkIdentity } from '../../types/ipc';
import { useGroupsStore } from '../../stores/groups.store';
import { usePeersStore } from '../../stores/peers.store';
import { useAppStore } from '../../stores/app.store';
import { useFileTransferStore } from '../../stores/file-transfer.store';
import { MessageBubble } from '../conversations/MessageBubble';
import { TransferProgress } from '../file-transfer/TransferProgress';
import { MessageInput } from '../conversations/MessageInput';
import { Users, Shield, X, Pencil, Trash2, UserPlus, Lock } from 'lucide-react';

interface GroupViewProps {
  group: LinkGroup;
}

export function GroupView({ group }: GroupViewProps) {
  const { sendGroupMessage, renameGroup, deleteGroup, addMembersToGroup, removeMemberFromGroup, markGroupRead } = useGroupsStore();
  const { selectGroup } = useAppStore();
  const { transfers, offerFileToGroup, offerFolderToGroup, offerPastedFileToGroup, offerPastedBufferToGroup } = useFileTransferStore();
  const { peers } = usePeersStore();
  const [localIdentity, setLocalIdentity] = useState<LinkIdentity | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedPeersToAdd, setSelectedPeersToAdd] = useState<string[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  const [isSelectiveShareOpen, setIsSelectiveShareOpen] = useState(false);
  const [selectedPeersForShare, setSelectedPeersForShare] = useState<string[]>([]);

  useEffect(() => {
    if (window.link?.identity) {
      window.link.identity.getIdentity().then(setLocalIdentity).catch(console.error);
    }
  }, []);

  useEffect(() => {
    markGroupRead(group.id);
  }, [group.id, markGroupRead]);

  const groupMessages = group.messages || [];
  const groupTransfers = Array.from(transfers.values()).filter(t => t.groupId === group.id);

  // Group outgoing transfers by transferBatchId
  const batchedTransfers: Record<string, typeof groupTransfers> = {};
  const unbatchedTransfers: typeof groupTransfers = [];
  
  groupTransfers.forEach(t => {
    if (t.direction === 'outgoing' && t.transferBatchId) {
      if (!batchedTransfers[t.transferBatchId]) batchedTransfers[t.transferBatchId] = [];
      batchedTransfers[t.transferBatchId].push(t);
    } else {
      unbatchedTransfers.push(t);
    }
  });

  type ChatTimelineItem = 
    | { kind: 'message'; id: string; timestamp: number; data: typeof groupMessages[0] }
    | { kind: 'transfer'; id: string; timestamp: number; data: typeof groupTransfers[0] }
    | { kind: 'transfer_batch'; id: string; timestamp: number; data: typeof groupTransfers };

  const timelineItems: ChatTimelineItem[] = [
    ...groupMessages.map(msg => ({
      kind: 'message' as const,
      id: msg.id,
      timestamp: msg.timestamp,
      data: msg
    })),
    ...unbatchedTransfers.map(t => ({
      kind: 'transfer' as const,
      id: t.id,
      timestamp: t.startedAt || 0,
      data: t
    })),
    ...Object.entries(batchedTransfers).map(([batchId, batchTransfers]) => ({
      kind: 'transfer_batch' as const,
      id: batchId,
      timestamp: batchTransfers[0].startedAt || 0,
      data: batchTransfers
    }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  // Auto scroll to bottom when new items arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [timelineItems.length]);

  const handleSend = (text: string) => {
    sendGroupMessage(group.id, text);
  };

  const getOnlinePeerIds = () => {
    return group.members
      .filter(m => {
        if (m.peerId === localIdentity?.deviceId) return false;
        const p = peers.get(m.peerId);
        return p?.status === 'online';
      })
      .map(m => m.peerId);
  };

  const handleAttachFile = () => {
    const peerIds = getOnlinePeerIds();
    if (peerIds.length === 0) return;
    offerFileToGroup(peerIds, group.id);
  };

  const handleAttachFolder = () => {
    const peerIds = getOnlinePeerIds();
    if (peerIds.length === 0) return;
    offerFolderToGroup(peerIds, group.id);
  };

  const handlePasteFile = (path: string) => {
    const peerIds = getOnlinePeerIds();
    if (peerIds.length === 0) return;
    offerPastedFileToGroup(peerIds, path, group.id);
  };

  const handlePasteBuffer = (buffer: ArrayBuffer, mimeType: string) => {
    const peerIds = getOnlinePeerIds();
    if (peerIds.length === 0) return;
    offerPastedBufferToGroup(peerIds, buffer, mimeType, group.id);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Must prevent default to allow dropping
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (const file of Array.from(e.dataTransfer.files)) {
        const path = (file as any).path;
        if (path) {
          handlePasteFile(path);
        }
      }
    }
  };

  const executeSelectiveShare = async (type: 'file' | 'folder') => {
    if (selectedPeersForShare.length === 0) return;
    
    if (type === 'file') {
      await offerFileToGroup(selectedPeersForShare, group.id);
    } else {
      await offerFolderToGroup(selectedPeersForShare, group.id);
    }
    
    setIsSelectiveShareOpen(false);
    setSelectedPeersForShare([]);
  };

  return (
    <div 
      style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          border: '2px dashed var(--accent-primary)',
          borderRadius: 'var(--radius-md)',
          margin: 'var(--space-2)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--accent-primary)', borderRadius: '50%', color: 'white' }}>
              <Users size={40} />
            </div>
            <h2 style={{ margin: 0 }}>Drop files to send to {group.name}</h2>
          </div>
        </div>
      )}
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
          {timelineItems.length === 0 ? (
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
            timelineItems.map((item, i) => {
              if (item.kind === 'message') {
                return (
                  <MessageBubble
                    key={item.id || `msg-${i}`}
                    message={item.data}
                    isSelf={item.data.senderId === localIdentity?.deviceId}
                    showSenderLabel={true}
                  />
                );
              } else if (item.kind === 'transfer') {
                return <TransferProgress key={item.id} transfer={item.data} isSelf={item.data.direction === 'outgoing'} />;
              } else if (item.kind === 'transfer_batch') {
                const recipientNames = item.data.map(t => {
                  const p = peers.get(t.peerId);
                  return p ? p.displayName : 'Unknown';
                }).join(', ');

                return (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', margin: 'var(--space-1) 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-meta)', color: 'var(--text-secondary)', marginBottom: '2px', paddingRight: '4px' }}>
                      <Lock size={12} opacity={0.7} />
                      <span>Sent to {recipientNames}</span>
                    </div>
                    {item.data.map(t => <TransferProgress key={t.id} transfer={t} isSelf={true} />)}
                  </div>
                );
              }
              return null;
            })
          )}
        </div>

        {/* Input Footer */}
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--border-color)', position: 'relative' }}>
          {isSelectiveShareOpen && (
            <div style={{ 
              position: 'absolute', 
              bottom: '100%', 
              left: 'var(--space-5)', 
              marginBottom: 'var(--space-2)',
              backgroundColor: 'var(--bg-sidebar)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3)',
              width: 250,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--font-size-meta)', fontWeight: 600 }}>Selective Share</span>
                <X size={14} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => setIsSelectiveShareOpen(false)} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto', marginBottom: 'var(--space-3)' }}>
                {group.members.filter(m => m.peerId !== localIdentity?.deviceId).map(m => {
                  const p = peers.get(m.peerId);
                  const isOnline = p?.status === 'online';
                  return (
                    <label key={m.peerId} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-body)', cursor: isOnline ? 'pointer' : 'not-allowed', opacity: isOnline ? 1 : 0.5 }}>
                      <input 
                        type="checkbox" 
                        disabled={!isOnline}
                        checked={selectedPeersForShare.includes(m.peerId)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPeersForShare([...selectedPeersForShare, m.peerId]);
                          else setSelectedPeersForShare(selectedPeersForShare.filter(id => id !== m.peerId));
                        }}
                      />
                      {m.displayName}
                    </label>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button 
                  disabled={selectedPeersForShare.length === 0}
                  onClick={() => executeSelectiveShare('file')}
                  style={{ flex: 1, padding: '4px', cursor: selectedPeersForShare.length > 0 ? 'pointer' : 'not-allowed', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', fontSize: 'var(--font-size-meta)' }}
                >
                  Send File
                </button>
                <button 
                  disabled={selectedPeersForShare.length === 0}
                  onClick={() => executeSelectiveShare('folder')}
                  style={{ flex: 1, padding: '4px', cursor: selectedPeersForShare.length > 0 ? 'pointer' : 'not-allowed', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: 'var(--font-size-meta)' }}
                >
                  Send Folder
                </button>
              </div>
            </div>
          )}
          <MessageInput 
            onSend={handleSend} 
            placeholder={`Message #${group.name}...`}
            onAttachFile={handleAttachFile}
            onAttachFolder={handleAttachFolder}
            onAttachSelective={() => setIsSelectiveShareOpen(!isSelectiveShareOpen)}
            onPasteFile={handlePasteFile}
            onPasteBuffer={handlePasteBuffer}
          />
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
              <React.Fragment key={m.peerId ? `${m.peerId}-${i}` : `member-${i}`}>
                <div
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
                        onClick={() => setMemberToRemove(m.peerId)} 
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--status-error)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                      />
                    </span>
                  )}
                </div>
                {memberToRemove === m.peerId && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', border: '1px solid var(--status-error)', borderRadius: '4px', padding: 'var(--space-2)', marginTop: '4px', marginBottom: '8px' }}>
                    <span style={{ fontSize: 'var(--font-size-meta)', color: 'var(--text-primary)' }}>Remove {m.displayName}?</span>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button 
                        style={{ flex: 1, padding: '2px 4px', fontSize: 'var(--font-size-meta)', cursor: 'pointer', backgroundColor: 'var(--status-error)', color: 'white', border: 'none', borderRadius: '4px' }}
                        onClick={() => {
                          removeMemberFromGroup(group.id, m.peerId!);
                          setMemberToRemove(null);
                        }}
                      >Remove</button>
                      <button 
                        style={{ flex: 1, padding: '2px 4px', fontSize: 'var(--font-size-meta)', cursor: 'pointer', backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                        onClick={() => setMemberToRemove(null)}
                      >Cancel</button>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
