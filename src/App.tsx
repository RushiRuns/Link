import { useEffect, useState } from 'react';
import { GlobalStyles } from './components/design-system/GlobalStyles';
import { AppShell } from './components/layout/AppShell';
import { PeerList } from './components/peers/PeerList';
import { ConversationView } from './components/conversations/ConversationView';
import { GroupView } from './components/groups/GroupView';
import { FileTransferOffer } from './components/file-transfer/FileTransferOffer';
import { IncomingCallModal } from './components/calls/IncomingCallModal';
import { CallScreen } from './components/calls/CallScreen';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { OnboardingModal } from './components/settings/OnboardingModal';
import { PeerProfile } from './components/peers/PeerProfile';
import { useAppStore } from './stores/app.store';
import { usePeersStore } from './stores/peers.store';
import { useGroupsStore } from './stores/groups.store';
import { useFileTransferStore } from './stores/file-transfer.store';
import { useCallsStore } from './stores/calls.store';
import { useConversationsStore } from './stores/conversations.store';
import { LinkPeer } from './types/ipc';
import { Shield, Activity, Radio } from 'lucide-react';

export default function App() {
  const { selectedPeerId, selectedGroupId } = useAppStore();
  const { peers, initListeners: initPeersListeners } = usePeersStore();
  const { groups } = useGroupsStore();
  const { incomingOffer } = useFileTransferStore();
  const { activeCall, incomingCall, initListeners: initCallListeners } = useCallsStore();
  const { initListeners: initConversationsListeners, loadFromDisk } = useConversationsStore();
  const { initListeners: initGroupsListeners, loadGroupsFromDisk } = useGroupsStore();
  const { initListeners: initFtListeners } = useFileTransferStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profilePeer, setProfilePeer] = useState<LinkPeer | null>(null);

  useEffect(() => {
    window.link.config.getDownloadPath().then((path) => {
      if (!path) {
        setShowOnboarding(true);
      }
    });

    loadFromDisk();
    loadGroupsFromDisk();
    const cleanCalls = initCallListeners();
    const cleanConversations = initConversationsListeners();
    const cleanGroups = initGroupsListeners();
    const cleanFt = initFtListeners();
    const cleanPeers = initPeersListeners();
    
    return () => {
      cleanCalls();
      cleanConversations();
      cleanGroups();
      cleanFt();
      cleanPeers();
    };
  }, [initCallListeners, initConversationsListeners, initGroupsListeners, initFtListeners, initPeersListeners, loadFromDisk]);

  const selectedPeer = selectedPeerId ? peers.get(selectedPeerId) : null;
  const selectedGroup = selectedGroupId ? groups.get(selectedGroupId) : null;

  return (
    <>
      <GlobalStyles />
      <AppShell sidebar={<PeerList onOpenSettings={() => setShowSettings(true)} />}>
        {selectedPeer ? (
          <ConversationView peer={selectedPeer} />
        ) : selectedGroup ? (
          <GroupView group={selectedGroup} />
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
              Select an online teammate or group from the sidebar to start communicating, sharing files, or launching P2P voice and video calls over LAN.
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
                <span>Zero Server Dependency</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={14} color="var(--accent-primary)" />
                <span>P2P WebRTC Voice & Video</span>
              </div>
            </div>
          </div>
        )}
      </AppShell>

      {incomingOffer && <FileTransferOffer offer={incomingOffer} />}
      {incomingCall && <IncomingCallModal />}
      {activeCall && <CallScreen />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}
      {profilePeer && <PeerProfile peer={profilePeer} onClose={() => setProfilePeer(null)} />}
    </>
  );
}
