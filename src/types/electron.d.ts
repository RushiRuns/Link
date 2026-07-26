import {
  LinkIdentity,
  LinkPeer,
  LinkMessage,
  LinkGroup,
  LinkFileTransfer,
  LinkCall,
  CallMediaType
} from './ipc';

export interface SystemInfo {
  platform: string;
  arch: string;
  hostname: string;
  cpuModel: string;
  cpuCores: number;
  totalMemGB: string;
  freeMemGB: string;
  versions: {
    electron: string;
    node: string;
    chrome: string;
  };
}

export interface LinkAPI {
  identity: {
    getIdentity: () => Promise<LinkIdentity>;
    setDisplayName: (name: string) => Promise<LinkIdentity>;
  };
  peers: {
    getKnownPeers: () => Promise<LinkPeer[]>;
    onPeerConnected: (callback: (peer: LinkPeer) => void) => () => void;
    onPeerDisconnected: (callback: (peerId: string) => void) => () => void;
    onNoPeersFound: (callback: () => void) => () => void;
  };
  messaging: {
    sendMessage: (peerId: string, content: string) => Promise<LinkMessage>;
    onMessageReceived: (callback: (message: LinkMessage) => void) => () => void;
    onMessageDelivered: (callback: (messageId: string) => void) => () => void;
  };
  groups: {
    createGroup: (name: string, memberPeerIds: string[]) => Promise<LinkGroup>;
    sendGroupMessage: (groupId: string, content: string) => Promise<LinkMessage>;
    onGroupMessageReceived: (callback: (message: LinkMessage) => void) => () => void;
  };
  fileTransfer: {
    offerFile: (peerId: string, filePath: string) => Promise<LinkFileTransfer>;
    respond: (transferId: string, accepted: boolean, savePath?: string) => Promise<void>;
    onOfferReceived: (callback: (transfer: LinkFileTransfer) => void) => () => void;
    onProgress: (callback: (transferId: string, bytesTransferred: number) => void) => () => void;
    onCompleted: (callback: (transferId: string) => void) => () => void;
  };
  calls: {
    offer: (peerId: string, mediaType: CallMediaType) => Promise<LinkCall>;
    answer: (callId: string, accepted: boolean) => Promise<void>;
    end: (callId: string) => Promise<void>;
    onOfferReceived: (callback: (call: LinkCall) => void) => () => void;
    onEnded: (callback: (callId: string) => void) => () => void;
  };
  theme: {
    onThemeChanged: (callback: (isDark: boolean) => void) => () => void;
  };
}

declare global {
  interface Window {
    electron?: {
      getSystemInfo: () => Promise<SystemInfo>;
      ping: () => Promise<{ message: string; timestamp: number }>;
      windowControl: (action: 'minimize' | 'maximize' | 'close') => void;
    };
    link: LinkAPI;
  }
}
