import { useEffect, useState } from 'react';
import { GlobalStyles } from './components/design-system/GlobalStyles';
import { AppShell } from './components/layout/AppShell';
import { LinkIdentity } from './types/ipc';
import { Users, MessageSquare, Shield, Activity } from 'lucide-react';

export default function App() {
  const [identity, setIdentity] = useState<LinkIdentity | null>(null);

  useEffect(() => {
    if (window.link?.identity) {
      window.link.identity.getIdentity().then(setIdentity).catch(console.error);
    }
  }, []);

  const sidebarContent = (
    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Users size={18} color="var(--accent-primary)" />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Teammates</span>
      </div>

      <div
        style={{
          padding: 'var(--space-3)',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}
      >
        <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
          {identity?.displayName || 'Local User'}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          ID: {identity?.deviceId || 'Initializing...'}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-3)' }}>
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Peers Online (0)
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Searching LAN for teammates...
        </div>
      </div>
    </div>
  );

  return (
    <>
      <GlobalStyles />
      <AppShell sidebar={sidebarContent}>
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
            <MessageSquare size={28} color="var(--accent-primary)" />
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
            Phase 1 Infrastructure Ready. Serverless P2P architecture initialized with Noise_XX E2E encryption and macOS Sequoia-inspired design system.
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
              <span>TOFU Key Store</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} color="var(--accent-primary)" />
              <span>Phase 1 Verified</span>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
