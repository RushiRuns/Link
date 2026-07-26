import { GlobalStyles } from './components/design-system/GlobalStyles';
import { AppShell } from './components/layout/AppShell';
import { PeerList } from './components/peers/PeerList';
import { ConversationView } from './components/conversations/ConversationView';
import { useAppStore } from './stores/app.store';
import { usePeersStore } from './stores/peers.store';
import { Shield, Activity, Radio } from 'lucide-react';

export default function App() {
  const { selectedPeerId } = useAppStore();
  const { peers } = usePeersStore();

  const selectedPeer = selectedPeerId ? peers.get(selectedPeerId) : null;

  return (
    <>
      <GlobalStyles />
      <AppShell sidebar={<PeerList />}>
        {selectedPeer ? (
          <ConversationView peer={selectedPeer} />
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-6)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--accent-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-4)'
              }}
            >
              <Radio size={28} color="var(--accent-primary)" />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
              Link LAN Messenger
            </h2>
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                maxWidth: 420,
                lineHeight: 1.5,
                marginBottom: 'var(--space-5)'
              }}
            >
              Select an online teammate from the sidebar to start an end-to-end encrypted 1-to-1 conversation.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                backgroundColor: 'var(--bg-card)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '0.8rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={14} color="var(--status-online)" />
                <span>Noise_XX Encrypted</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={14} color="var(--accent-primary)" />
                <span>Sub-Second Delivery</span>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </>
  );
}
