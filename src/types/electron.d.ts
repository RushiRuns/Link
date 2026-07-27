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
    onGroupCreated: (callback: (group: LinkGroup) => void) => () => void;
    onGroupMessageReceived: (callback: (message: LinkMessage) => void) => () => void;
  };
  fileTransfer: {
    offerFile: (peerId: string, filePath: string) => Promise<LinkFileTransfer>;
    respond: (transferId: string, accepted: boolean, savePath?: string) => Promise<void>;
    openFolder: (transferId: string) => Promise<boolean>;
    onOfferReceived: (callback: (transfer: LinkFileTransfer) => void) => () => void;
    onProgress: (callback: (transferId: string, bytesTransferred: number) => void) => () => void;
    onCompleted: (callback: (transferId: string) => void) => () => void;
  };
  calls: {
    offerCall: (peerId: string, mediaType: 'voice' | 'video', sdp: string) => Promise<LinkCall>;
    answerCall: (callId: string, accepted: boolean, sdp?: string) => Promise<void>;
    sendIceCandidate: (callId: string, candidate: any) => Promise<void>;
    endCall: (callId: string) => Promise<void>;
    onOfferReceived: (callback: (call: LinkCall & { sdp: string }) => void) => () => void;
    onAnswerReceived: (callback: (data: { callId: string; accepted: boolean; sdp?: string }) => void) => () => void;
    onIceCandidateReceived: (callback: (data: { callId: string; candidate: any }) => void) => () => void;
    onCallEnded: (callback: (callId: string) => void) => () => void;
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
