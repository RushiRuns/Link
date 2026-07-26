import { useEffect, useRef, useState } from 'react';
import { LinkPeer, LinkIdentity } from '../../types/ipc';
import { useConversationsStore } from '../../stores/conversations.store';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { Shield, AlertCircle } from 'lucide-react';

interface ConversationViewProps {
  peer: LinkPeer;
}

export function ConversationView({ peer }: ConversationViewProps) {
  const { messages, sendMessage, markConversationRead, initListeners } = useConversationsStore();
  const [localIdentity, setLocalIdentity] = useState<LinkIdentity | null>(null);
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
    const cleanup = initListeners();
    return cleanup;
  }, [conversationId, markConversationRead, initListeners]);

  const conversationMessages = messages.get(conversationId) || [];

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationMessages.length]);

  const handleSend = (text: string) => {
    sendMessage(peer.id, text);
  };

  const isOffline = peer.status === 'offline';
  const isVersionMismatch = peer.status === 'version_mismatch';

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
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{peer.displayName}</div>
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'var(--bg-card)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            Fingerprint: {peer.publicKeyFingerprint}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--status-online)' }}>
          <Shield size={14} color="var(--status-online)" />
          <span>E2E Encrypted</span>
        </div>
      </div>

      {/* Offline / Version Mismatch Banner */}
      {isOffline && (
        <div
          style={{
            padding: 'var(--space-2) var(--space-4)',
            backgroundColor: 'rgba(107, 114, 128, 0.12)',
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            textAlign: 'center',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          {peer.displayName} is offline. Messages cannot be sent right now.
        </div>
      )}

      {isVersionMismatch && (
        <div
          style={{
            padding: 'var(--space-2) var(--space-4)',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--status-warning)',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            borderBottom: '1px solid rgba(245, 158, 11, 0.3)'
          }}
        >
          <AlertCircle size={15} />
          <span>Link version mismatch — please ensure all teammates are on the same version to connect.</span>
        </div>
      )}

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
        {conversationMessages.length === 0 ? (
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
            <Shield size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
            <div>Encrypted 1-to-1 conversation with {peer.displayName}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Send a message to begin chatting</div>
          </div>
        ) : (
          conversationMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isSelf={msg.senderId === localIdentity?.deviceId}
            />
          ))
        )}
      </div>

      {/* Message Input Footer */}
      <div style={{ padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--border-color)' }}>
        <MessageInput onSend={handleSend} disabled={isOffline || isVersionMismatch} />
      </div>
    </div>
  );
}
