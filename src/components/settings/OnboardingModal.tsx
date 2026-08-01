import { useState } from 'react';
import { FolderHeart } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectFolder = async () => {
    try {
      // Re-using the same dialog IPC used elsewhere, but wait, do we have an IPC for this?
      const result = await window.link.dialog.selectFolder();
      if (result) {
        setSelectedPath(result);
      }
    } catch (err) {
      console.error('[Onboarding] Error selecting folder:', err);
    }
  };

  const handleContinue = async () => {
    if (!selectedPath || isSaving) return;
    setIsSaving(true);
    try {
      await window.link.config.setDownloadPath(selectedPath);
      onComplete();
    } catch (err) {
      console.error('[Onboarding] Error saving download path:', err);
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
        backgroundColor: 'var(--bg-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999, // Absolute top
      }}
    >
      <div
        style={{
          width: 460,
          backgroundColor: 'var(--bg-sidebar)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 'var(--space-8)',
          textAlign: 'center'
        }}
      >
        <div style={{ marginBottom: 'var(--space-6)', color: 'var(--accent-primary)' }}>
          <FolderHeart size={48} strokeWidth={1.5} />
        </div>
        
        <h2 style={{ marginBottom: 'var(--space-2)', fontSize: '24px', fontWeight: 600 }}>Welcome to Link</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
          Before we get started, please select a default folder where all your received files and folders will be saved.
        </p>

        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-6)',
            gap: 'var(--space-3)'
          }}
        >
          <div style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: selectedPath ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontSize: '13px',
            textAlign: 'left'
          }}>
            {selectedPath || 'No folder selected'}
          </div>
          <button
            onClick={handleSelectFolder}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--bg-card-hover)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Browse
          </button>
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedPath || isSaving}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: !selectedPath ? 'var(--bg-card-hover)' : 'var(--accent-primary)',
            color: !selectedPath ? 'var(--text-tertiary)' : 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: !selectedPath ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'background-color 0.2s'
          }}
        >
          {isSaving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
