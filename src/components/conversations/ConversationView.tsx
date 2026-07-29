import { useEffect, useRef, useState } from 'react';
import { LinkPeer, LinkIdentity } from '../../types/ipc';
import { useConversationsStore } from '../../stores/conversations.store';
import { useFileTransferStore } from '../../stores/file-transfer.store';
import { useCallsStore } from '../../stores/calls.store';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TransferProgress } from '../file-transfer/TransferProgress';
import { Shield, AlertCircle, Phone, Video, Trash2 } from 'lucide-react';

interface ConversationViewProps {
  peer: LinkPeer;
}

export function ConversationView({ peer }: ConversationViewProps) {
  const { messages, sendMessage, markConversationRead } = useConversationsStore();
  const { transfers, offerFile, offerFolder } = useFileTransferStore();
  const { setActiveCall } = useCallsStore();
  const [localIdentity, setLocalIdentity] = useState<LinkIdentity | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.link?.identity) {
      window.link.identity.getIdentity().then(setLocalIdentity).catch(console.error);
    }
  }, []);

  const conversationId = localIdentity
    ? [localIdentity.deviceId, peer.id].sort().join('_')
    : 'default';

  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId, markConversationRead]);

  const conversationMessages = messages.get(conversationId) || [];
  const peerTransfers = Array.from(transfers.values()).filter((t) => t.peerId === peer.id);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationMessages.length, peerTransfers.length]);

  const handleSend = (text: string) => {
    sendMessage(peer.id, text);
  };

  const handleAttachFile = () => {
    offerFile(peer.id);
  };

  const handleStartCall = (mediaType: 'voice' | 'video') => {
    setActiveCall({
      callId: 'call_' + Date.now(),
      peerId: peer.id,
      peerName: peer.displayName,
      mediaType,
      status: 'ringing',
      isIncoming: false
    });
  };

  const isOffline = peer.status === 'offline';
  const isVersionMismatch = peer.status === 'version_mismatch';

  // Merge messages and file transfers into a single chronologically sorted timeline
  type ChatTimelineItem =
    | { kind: 'message'; id: string; timestamp: number; data: typeof conversationMessages[0] }
    | { kind: 'transfer'; id: string; timestamp: number; data: typeof peerTransfers[0] };

  const timelineItems: ChatTimelineItem[] = [
    ...conversationMessages.map((msg) => ({
      kind: 'message' as const,
      id: msg.id,
      timestamp: msg.timestamp,
      data: msg
    })),
    ...peerTransfers.map((transfer) => ({
      kind: 'transfer' as const,
      id: transfer.id,
      timestamp: transfer.startedAt || 0,
      data: transfer
    }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-header)' }}>{peer.displayName}</div>
          <span
            style={{
              fontSize: 'var(--font-size-meta)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'var(--bg-card)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)'
            }}
          >
            Fingerprint: {peer.publicKeyFingerprint}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* Call Initiation Buttons & Clear Button */}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {!isOffline && !isVersionMismatch && (
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
            <div style={{ fontSize: 'var(--font-size-meta)', opacity: 0.8 }}>Send a message or start a call to begin</div>
          </div>
        ) : (
          timelineItems.map((item) => {
            if (item.kind === 'message') {
              return (
                <MessageBubble
                  key={item.id}
                  message={item.data}
                  isSelf={item.data.senderId === localIdentity?.deviceId}
                />
              );
            }
            return (
              <TransferProgress
                key={item.id}
                transfer={item.data}
                isSelf={item.data.direction === 'outgoing'}
              />
            );
          })
        )}
      </div>

      {/* Message Input Footer */}
      <div style={{ padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--border-color)' }}>
        <MessageInput
          onSend={handleSend}
          onAttachFile={handleAttachFile}
          onAttachFolder={() => offerFolder(peer.id)}
          onPasteFile={async (path) => {
            if (path && window.link?.fileTransfer) {
              const transfers = await window.link.fileTransfer.offerFile(peer.id, path);
              if (transfers) {
                const transferArray = Array.isArray(transfers) ? transfers : [transfers];
                transferArray.forEach(t => useFileTransferStore.getState().addTransfer(t));
              }
            }
          }}
          onPasteBuffer={async (buffer, mimeType) => {
            if (window.link?.fileTransfer) {
              const savedPath = await window.link.fileTransfer.saveBuffer(buffer, mimeType);
              if (savedPath) {
                const transfers = await window.link.fileTransfer.offerFile(peer.id, savedPath);
                if (transfers) {
                  const transferArray = Array.isArray(transfers) ? transfers : [transfers];
                  transferArray.forEach(t => useFileTransferStore.getState().addTransfer(t));
                }
              }
            }
          }}
          disabled={isOffline || isVersionMismatch}
        />
      </div>

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
              textAlign: 'center'
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
            
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
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
                  useConversationsStore.getState().clearConversation(conversationId);
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
