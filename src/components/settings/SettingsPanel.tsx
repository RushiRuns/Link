import { useEffect, useState } from 'react';
import { LinkIdentity } from '../../types/ipc';
import { useAppStore } from '../../stores/app.store';
import { X, User, Key, Shield, Sun, Moon, Info } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [identity, setIdentity] = useState<LinkIdentity | null>(null);
  const [displayName, setDisplayNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { isDarkMode, setDarkMode } = useAppStore();

  useEffect(() => {
    if (window.link?.identity) {
      window.link.identity.getIdentity().then((id) => {
        setIdentity(id);
        setDisplayNameInput(id.displayName);
      }).catch(console.error);
    }
  }, []);

  const handleSaveDisplayName = async () => {
    if (!displayName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      if (window.link?.identity) {
        const updated = await window.link.identity.setDisplayName(displayName.trim());
        setIdentity(updated);
      }
    } catch (err) {
      console.error('[Settings] Error setting display name:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1400,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      <div
        style={{
          width: 440,
          backgroundColor: 'var(--bg-sidebar)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Shield size={16} strokeWidth={1.5} color="var(--accent-primary)" />
            <h3 style={{ fontSize: 'var(--font-size-title)', fontWeight: 600 }}>Preferences & Identity</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Display Name Section */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: 'var(--font-size-meta)',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-2)'
              }}
            >
              <User size={14} strokeWidth={1.5} /> DISPLAY NAME
            </label>

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="Enter display name..."
                style={{
                  flex: 1,
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-body)',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleSaveDisplayName}
                disabled={isSaving || !displayName.trim() || displayName.trim() === identity?.displayName}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor:
                    !displayName.trim() || displayName.trim() === identity?.displayName
                      ? 'var(--bg-card-hover)'
                      : 'var(--accent-primary)',
                  color:
                    !displayName.trim() || displayName.trim() === identity?.displayName
                      ? 'var(--text-muted)'
                      : '#ffffff',
                  cursor:
                    !displayName.trim() || displayName.trim() === identity?.displayName
                      ? 'default'
                      : 'pointer',
                  fontWeight: 500,
                  fontSize: 'var(--font-size-body)'
                }}
              >
                Save
              </button>
            </div>
          </div>

          {/* Cryptographic Key Fingerprint Section */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: 'var(--font-size-meta)',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-2)'
              }}
            >
              <Key size={14} strokeWidth={1.5} /> CRYPTOGRAPHIC PUBLIC KEY FINGERPRINT (TOFU)
            </label>
            <div
              style={{
                padding: 'var(--space-3)',
                backgroundColor: 'var(--bg-app)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-meta)',
                color: 'var(--text-primary)',
                wordBreak: 'break-all'
              }}
            >
              {identity?.publicKeyFingerprint || 'Deriving Curve25519 fingerprint...'}
            </div>
            <div style={{ fontSize: 'var(--font-size-meta)', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Teammates match this SHA-256 fingerprint for out-of-band identity verification (Trust On First Use).
            </div>
          </div>

          {/* Appearance Section */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: 'var(--font-size-meta)',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-2)'
              }}
            >
              {isDarkMode ? <Moon size={14} strokeWidth={1.5} /> : <Sun size={14} strokeWidth={1.5} />} APPEARANCE
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-3)',
                backgroundColor: 'var(--bg-app)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)'
              }}
            >
              <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--text-primary)' }}>
                Theme: <strong>{isDarkMode ? 'Dark (Matte Grey)' : 'Light (macOS)'}</strong>
              </span>
              <button
                onClick={() => setDarkMode(!isDarkMode)}
                style={{
                  padding: 'var(--space-1) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-meta)',
                  fontWeight: 500,
                  transition: 'background-color var(--transition-fast)'
                }}
              >
                Toggle Theme
              </button>
            </div>
          </div>

          {/* App Version Info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'var(--font-size-meta)',
              color: 'var(--text-secondary)',
              borderTop: '1px solid var(--border-color)',
              paddingTop: 'var(--space-3)'
            }}
          >
            <Info size={14} strokeWidth={1.5} />
            <span>Link LAN Messenger v2.0.0 • Peer-to-Peer Encrypted Network</span>
          </div>
        </div>
      </div>
    </div>
  );
}
