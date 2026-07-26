import { GlobalStyles } from './components/design-system/GlobalStyles';
import { AppShell } from './components/layout/AppShell';
import { PeerList } from './components/peers/PeerList';
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{selectedPeer.displayName}</h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  backgroundColor: 'var(--bg-card)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                Fingerprint: {selectedPeer.publicKeyFingerprint}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Direct conversation view. Phase 3 Peer Discovery Active.
            </p>
          </div>
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
              Automatic Peer Discovery Active
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
              Layered mDNS & UDP broadcast discovery is scanning your local network. Select a teammate from the sidebar to view connection details.
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
                <span>TOFU Verification</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={14} color="var(--accent-primary)" />
                <span>mDNS / UDP Active</span>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </>
  );
}
