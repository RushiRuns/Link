import { useEffect, useRef, useState } from 'react';
import { LinkPeer, LinkIdentity } from '../../types/ipc';
import { useConversationsStore } from '../../stores/conversations.store';
import { useFileTransferStore } from '../../stores/file-transfer.store';
import { useCallsStore } from '../../stores/calls.store';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TransferProgress } from '../file-transfer/TransferProgress';
import { FilePreviewModal, PreviewItem } from '../file-transfer/FilePreviewModal';
import { Shield, UploadCloud, AlertCircle, Phone, Video, Trash2, CornerUpLeft, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { getConversationId } from '../../utils/conversation';

interface ConversationViewProps {
  peer: LinkPeer;
}

export function ConversationView({ peer }: ConversationViewProps) {
  const { 
    messages, 
    typingPeers, 
    sendMessage, 
    markConversationRead,
    editingMessageIds,
    setEditingMessageId,
    replyingToMessageIds,
    setReplyingToMessageId,
    editMessageLocally,
    deleteMessageLocally
  } = useConversationsStore();
  const { transfers } = useFileTransferStore();
  const { activeCall, incomingCall, setActiveCall } = useCallsStore();
  const [localIdentity, setLocalIdentity] = useState<LinkIdentity | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const [previewItems, setPreviewItems] = useState<PreviewItem[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.link?.identity) {
      window.link.identity.getIdentity().then(setLocalIdentity).catch(console.error);
    }
  }, []);

  const conversationId = localIdentity
    ? getConversationId(localIdentity.deviceId, peer.id)
    : null;

  useEffect(() => {
    if (conversationId) {
      markConversationRead(conversationId);
    }
  }, [conversationId, markConversationRead]);

  const conversationMessages = conversationId ? (messages.get(conversationId) || []) : [];
  const peerTransfers = Array.from(transfers.values()).filter((t) => t.peerId === peer.id && !t.groupId);

  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      
      if (isNearBottom || !hasInitialScrolled) {
        scrollRef.current.scrollTop = scrollHeight;
        if (!hasInitialScrolled) {
          setHasInitialScrolled(true);
        }
      }
    }
  }, [conversationMessages.length, peerTransfers.length, hasInitialScrolled]);

  const prevConversationId = useRef(conversationId);
  useEffect(() => {
    if (prevConversationId.current !== conversationId) {
      prevConversationId.current = conversationId;
      setHasInitialScrolled(false);
    }
  }, [conversationId]);

  const clearModalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showClearConfirm && clearModalRef.current) {
      const focusableElements = clearModalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [showClearConfirm]);

  const latestSentMessageId = [...conversationMessages].reverse().find(m => m.senderId === localIdentity?.deviceId)?.id;
  const editingMessageId = conversationId ? (editingMessageIds[conversationId] ?? null) : null;
  const replyingToMessageId = conversationId ? (replyingToMessageIds[conversationId] ?? null) : null;
  const editingMessageContent = conversationMessages.find(m => m.id === editingMessageId)?.content;
  const replyingToMessage = conversationMessages.find(m => m.id === replyingToMessageId);

  const handleSend = (text: string) => {
    if (!conversationId) return;
    if (editingMessageId) {
      if (window.link?.messaging) {
        window.link.messaging.sendEditMessage(peer.id, editingMessageId, text);
        editMessageLocally(conversationId, editingMessageId, text);
      }
      setEditingMessageId(conversationId, null);
    } else {
      sendMessage(peer.id, text, replyingToMessageId || undefined);
      setReplyingToMessageId(conversationId, null);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).catch(console.error);
  };

  const handleRetry = (msg: typeof conversationMessages[0]) => {
    if (!conversationId) return;
    deleteMessageLocally(conversationId, msg.id);
    sendMessage(peer.id, msg.content, msg.replyToMessageId);
  };

  const handleDelete = async (messageId: string) => {
    if (!conversationId) return;
    if (window.link?.messaging) {
      try {
        await window.link.messaging.sendDeleteMessage(peer.id, messageId);
        deleteMessageLocally(conversationId, messageId);
        if (editingMessageId === messageId) {
          setEditingMessageId(conversationId, null);
        }
      } catch (err) {
        console.error('Failed to delete message:', err);
        window.alert('Failed to delete message. The teammate may be offline or unreachable.');
      }
    }
  };

  const handleAttachFile = async () => {
    if (window.link?.dialog) {
      const files = await window.link.dialog.selectFiles();
      if (files && files.length > 0) {
        const items = files.map(f => ({
          path: f.path,
          name: f.name,
          size: f.size,
          isFolder: false
        }));
        setPreviewItems(items);
      }
    }
  };

  const handleAttachFolder = async () => {
    if (window.link?.dialog) {
      const folder = await window.link.dialog.selectFolder();
      if (folder) {
        setPreviewItems([{ path: folder.path, name: folder.name, size: 0, isFolder: true }]);
      }
    }
  };

  const handleStartCall = (mediaType: 'voice' | 'video') => {
    if (peer.status === 'offline') {
      window.alert('Cannot call an offline teammate.');
      return;
    }
    if (activeCall || incomingCall) {
      window.alert('You are already in a call.');
      return;
    }
    setActiveCall({
      callId: 'call_' + uuidv4(),
      peerId: peer.id,
      peerName: peer.displayName,
      mediaType,
      status: 'ringing',
      isIncoming: false
    });
  };

  const isOffline = peer.status === 'offline';
  const isVersionMismatch = peer.status === 'version_mismatch';
  const isTyping = conversationId ? typingPeers.has(conversationId) : false;
  const isCallActive = activeCall !== null || incomingCall !== null;
  const isSelf = peer.id === localIdentity?.deviceId;

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOffline && !isVersionMismatch && !isSelf) {
      dragCounter.current++;
      if (dragCounter.current === 1) setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOffline && !isVersionMismatch && !isSelf) {
      dragCounter.current--;
      if (dragCounter.current === 0) setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    
    if (isOffline || isVersionMismatch) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const items: PreviewItem[] = [];
      for (const file of Array.from(e.dataTransfer.files)) {
        const path = (file as any).path;
        if (path) {
          items.push({ path, name: file.name, size: file.size, isFolder: false });
        }
      }
      if (items.length > 0) {
        setPreviewItems(items);
      }
    }
  };

  const batchedTransfers: Record<string, typeof peerTransfers> = {};
  const unbatchedTransfers: typeof peerTransfers = [];
  
  peerTransfers.forEach(t => {
    if (t.transferBatchId) {
      if (!batchedTransfers[t.transferBatchId]) batchedTransfers[t.transferBatchId] = [];
      batchedTransfers[t.transferBatchId].push(t);
    } else {
      unbatchedTransfers.push(t);
    }
  });

  type ChatTimelineItem =
    | { kind: 'message'; id: string; timestamp: number; data: typeof conversationMessages[0] }
    | { kind: 'transfer'; id: string; timestamp: number; data: typeof peerTransfers[0] }
    | { kind: 'transfer_batch'; id: string; timestamp: number; data: typeof peerTransfers };

  const timelineItems: ChatTimelineItem[] = [
    ...conversationMessages.map((msg) => ({
      kind: 'message' as const,
      id: msg.id,
      timestamp: msg.timestamp,
      data: msg
    })),
    ...unbatchedTransfers.map((transfer) => ({
      kind: 'transfer' as const,
      id: transfer.id,
      timestamp: transfer.startedAt || 0,
      data: transfer
    })),
    ...Object.entries(batchedTransfers).map(([batchId, batchTransfers]) => ({
      kind: 'transfer_batch' as const,
      id: batchId,
      timestamp: batchTransfers[0].startedAt || 0,
      data: batchTransfers
    }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  if (!conversationId) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading conversation...
      </div>
    );
  }

  return (
    <div 
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}
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
              <UploadCloud size={40} />
            </div>
            <h2 style={{ margin: 0 }}>Drop files to send to {peer.displayName}</h2>
          </div>
        </div>
      )}
      {/* Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-header)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{peer.displayName}</div>
          <span
            style={{
              fontSize: 'var(--font-size-meta)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'var(--bg-card)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              flexShrink: 0
            }}
          >
            Fingerprint: {peer.publicKeyFingerprint}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* Call Initiation Buttons & Clear Button */}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {!isOffline && !isVersionMismatch && !isCallActive && !isSelf && (
              <>
                <button
                  onClick={() => handleStartCall('voice')}
                  title="Start Voice Call"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'background-color var(--transition-fast)'
                  }}
                >
                  <Phone size={15} strokeWidth={1.5} />
                </button>

                <button
                  onClick={() => handleStartCall('video')}
                  title="Start Video Call"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--accent-primary)',
                    cursor: 'pointer',
                    transition: 'background-color var(--transition-fast)'
                  }}
                >
                  <Video size={15} strokeWidth={1.5} />
                </button>
              </>
            )}

            <button
              onClick={() => setShowClearConfirm(true)}
              title="Clear Conversation"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--status-offline)',
                cursor: 'pointer',
                transition: 'background-color var(--transition-fast)'
              }}
            >
              <Trash2 size={15} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Offline / Version Mismatch Banner */}
      {isOffline && (
        <div
          style={{
            padding: 'var(--space-2) var(--space-4)',
            backgroundColor: 'rgba(110, 110, 115, 0.12)',
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-meta)',
            textAlign: 'center',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          {peer.displayName} is offline. Messages and calls cannot be initiated right now.
        </div>
      )}

      {isVersionMismatch && (
        <div
          style={{
            padding: 'var(--space-2) var(--space-4)',
            backgroundColor: 'rgba(255, 159, 10, 0.15)',
            color: 'var(--status-warning)',
            fontSize: 'var(--font-size-meta)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            borderBottom: '1px solid rgba(255, 159, 10, 0.3)'
          }}
        >
          <AlertCircle size={15} strokeWidth={1.5} />
          <span>Link version mismatch — please ensure all teammates are on the same version to connect.</span>
        </div>
      )}

      {/* Message & File Transfer List */}
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
        <div style={{ minHeight: '16px', flexShrink: 0 }} />

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
            <Shield size={32} strokeWidth={1.5} color="var(--text-secondary)" style={{ opacity: 0.5 }} />
            <div>Encrypted 1-to-1 conversation with {peer.displayName}</div>
            <div style={{ fontSize: 'var(--font-size-meta)', opacity: 0.8 }}>
              {isOffline ? 'Peer is offline. Messaging and calls are disabled.' 
                : isVersionMismatch ? 'Peer version mismatch. Messaging and calls are disabled.'
                : isSelf ? 'You cannot message yourself.'
                : 'Send a message or start a call to begin'}
            </div>
          </div>
        ) : (
          timelineItems.map((item) => {
            if (item.kind === 'message') {
              return (
                <MessageBubble
                  key={item.id}
                  message={item.data}
                  isSelf={item.data.senderId === localIdentity?.deviceId}
                  isLatestMessage={item.data.id === latestSentMessageId}
                  repliedMessage={item.data.replyToMessageId ? conversationMessages.find(m => m.id === item.data.replyToMessageId) : undefined}
                  onReply={() => {
                    if (conversationId) {
                      setReplyingToMessageId(conversationId, item.data.id);
                      setEditingMessageId(conversationId, null); // Mutually exclusive
                    }
                  }}
                  onCopy={() => handleCopy(item.data.content)}
                  onEdit={() => {
                    if (conversationId) {
                      setEditingMessageId(conversationId, item.data.id);
                      setReplyingToMessageId(conversationId, null); // Mutually exclusive
                    }
                  }}
                  onDelete={() => handleDelete(item.data.id)}
                  onRetry={item.data.deliveryStatus === 'failed' ? () => handleRetry(item.data) : undefined}
                />
              );
            }
            if (item.kind === 'transfer') {
              return (
                <TransferProgress
                  key={item.id}
                  transfer={item.data}
                  isSelf={item.data.direction === 'outgoing'}
                  showCaption={true}
                />
              );
            }
            return (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', margin: 'var(--space-1) 0' }}>
                {item.data.map((t, index) => (
                  <TransferProgress 
                    key={t.id} 
                    transfer={t} 
                    isSelf={t.direction === 'outgoing'}
                    showCaption={index === item.data.length - 1} 
                  />
                ))}
              </div>
            );
          })
        )}

        {isTyping && (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: 'var(--space-2) var(--space-3)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--font-size-meta)',
              fontStyle: 'italic',
              animation: 'typingPulse 1.5s infinite ease-in-out',
              marginTop: 'var(--space-1)'
            }}
          >
            <style>
              {`
                @keyframes typingPulse {
                  0% { opacity: 0.4; }
                  50% { opacity: 1; }
                  100% { opacity: 0.4; }
                }
              `}
            </style>
            {peer.displayName} is typing...
          </div>
        )}
      </div>

      {/* Reply Preview Banner */}
      {replyingToMessage && (
        <div
          style={{
            padding: 'var(--space-2) var(--space-4)',
            backgroundColor: 'var(--bg-card)',
            borderTop: '1px solid var(--border-color)',
            borderLeft: '4px solid var(--accent-primary)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--space-3)'
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '2px' }}>
              <CornerUpLeft size={14} strokeWidth={2} />
              Replying to {replyingToMessage.senderName}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {replyingToMessage.content}
            </div>
          </div>
          <button
            onClick={() => { if (conversationId) setReplyingToMessageId(conversationId, null); }}
            title="Cancel reply"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
              display: 'flex'
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Message Input Footer */}
      <div style={{ padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--border-color)' }}>
        <MessageInput
          initialValue={editingMessageContent}
          isEditing={!!editingMessageId}
          onCancelEdit={() => { if (conversationId) setEditingMessageId(conversationId, null); }}
          onSend={handleSend}
          onTyping={(isTyping) => {
            if (window.link?.messaging) {
              window.link.messaging.sendTypingSignal(peer.id, isTyping);
            }
          }}
          onAttachFile={handleAttachFile}
          onAttachFolder={handleAttachFolder}
          onPasteFile={async (pastedFiles) => {
            if (pastedFiles && pastedFiles.length > 0) {
              const items = pastedFiles.map(f => ({
                path: f.path,
                name: f.name,
                size: f.size,
                isFolder: false
              }));
              setPreviewItems(items);
            }
          }}
          onPasteBuffer={async (buffer, mimeType) => {
            if (window.link?.fileTransfer) {
              const savedPath = await window.link.fileTransfer.saveBuffer(buffer, mimeType);
              if (savedPath) {
                setPreviewItems([{ path: savedPath, name: 'Pasted Image', size: buffer.byteLength, isFolder: false }]);
              }
            }
          }}
          disabled={isOffline || isVersionMismatch || isSelf}
          disabledReason={isSelf ? 'You cannot message yourself' : isVersionMismatch ? 'Peer version mismatch — messaging unavailable' : 'Peer is offline — messaging unavailable'}
        />
      </div>

      {previewItems && (
        <FilePreviewModal
          items={previewItems}
          recipientName={peer.displayName}
          onCancel={() => setPreviewItems(null)}
          onSend={async (message) => {
            if (previewItems.length > 0 && window.link?.fileTransfer) {
              const isFolder = previewItems[0].isFolder;
              if (isFolder && previewItems[0].path) {
                await useFileTransferStore.getState().offerFolders([peer.id], [previewItems[0].path], undefined, message);
              } else {
                const paths = previewItems.map(p => p.path).filter(Boolean) as string[];
                if (paths.length > 0) {
                  await useFileTransferStore.getState().offerFiles([peer.id], paths, undefined, message);
                }
              }
            }
            setPreviewItems(null);
          }}
        />
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1100, backdropFilter: 'blur(4px)'
          }}
        >
          <div
            ref={clearModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-modal-title"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowClearConfirm(false);
                e.stopPropagation();
              }
              if (e.key === 'Tab') {
                const focusableElements = e.currentTarget.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusableElements.length > 0) {
                  const firstElement = focusableElements[0] as HTMLElement;
                  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
                  if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                      lastElement.focus();
                      e.preventDefault();
                    }
                  } else {
                    if (document.activeElement === lastElement) {
                      firstElement.focus();
                      e.preventDefault();
                    }
                  }
                }
              }
            }}
            style={{
              width: 360,
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              padding: 'var(--space-5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              outline: 'none'
            }}
          >
            <div
              style={{
                width: 52, height: 52, borderRadius: '50%',
                backgroundColor: 'rgba(255, 71, 87, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 'var(--space-3)'
              }}
            >
              <Trash2 size={26} color="var(--status-offline)" />
            </div>
            
            <h3 id="clear-modal-title" style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
              Clear Conversation?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-5)', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete all messages and file transfer history with {peer.displayName}? This cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-3)', width: '100%' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)', background: 'transparent',
                  color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  useConversationsStore.getState().clearConversation(conversationId!);
                  useFileTransferStore.getState().clearPeerTransfers(peer.id);
                  setShowClearConfirm(false);
                }}
                style={{
                  flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                  border: 'none', backgroundColor: 'var(--status-offline)',
                  color: '#ffffff', cursor: 'pointer', fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
