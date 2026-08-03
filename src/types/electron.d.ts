import {
  LinkIdentity,
  LinkPeer,
  LinkMessage,
  LinkGroup,
  LinkFileTransfer,
  LinkCall,
  CallMediaType,
  LinkTypingEvent,
  LinkMessageEditEvent,
  LinkMessageDeleteEvent
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
  config: {
    getDownloadPath: () => Promise<string>;
    setDownloadPath: (path: string) => Promise<boolean>;
  };
  identity: {
    getIdentity: () => Promise<LinkIdentity>;
    setDisplayName: (name: string) => Promise<LinkIdentity>;
  };
  peers: {
    getKnownPeers: () => Promise<LinkPeer[]>;
    getActivePeers: () => Promise<LinkPeer[]>;
    onPeerConnected: (callback: (peer: LinkPeer) => void) => () => void;
    onPeerDisconnected: (callback: (peerId: string) => void) => () => void;
    onNoPeersFound: (callback: () => void) => () => void;
  };
  messaging: {
    loadMessages: () => Promise<Record<string, LinkMessage[]>>;
    saveMessages: (messages: Record<string, LinkMessage[]>) => Promise<void>;
    sendMessage: (peerId: string, content: string, replyToMessageId?: string) => Promise<LinkMessage>;
    onMessageReceived: (callback: (message: LinkMessage) => void) => () => void;
    onMessageDelivered: (callback: (messageId: string) => void) => () => void;
    sendTypingSignal: (peerId: string, groupId?: string) => Promise<void>;
    onTypingReceived: (callback: (event: LinkTypingEvent) => void) => () => void;
    sendEditMessage: (peerId: string, messageId: string, newContent: string) => Promise<void>;
    sendDeleteMessage: (peerId: string, messageId: string) => Promise<void>;
    onMessageEdited: (callback: (event: LinkMessageEditEvent & { senderDeviceId: string }) => void) => () => void;
    onMessageDeleted: (callback: (event: LinkMessageDeleteEvent & { senderDeviceId: string }) => void) => () => void;
  };
  groups: {
    createGroup: (name: string, memberPeerIds: string[]) => Promise<LinkGroup>;
    sendGroupMessage: (groupId: string, content: string, replyToMessageId?: string) => Promise<LinkMessage>;
    onGroupCreated: (callback: (group: LinkGroup) => void) => () => void;
    onGroupMessageReceived: (callback: (message: LinkMessage) => void) => () => void;
    renameGroup: (groupId: string, newName: string) => Promise<void>;
    deleteGroup: (groupId: string) => Promise<void>;
    onGroupRenamed: (callback: (data: { groupId: string, newName: string }) => void) => () => void;
    onGroupDeleted: (callback: (groupId: string) => void) => () => void;
    addMembers: (groupId: string, memberPeerIds: string[]) => Promise<void>;
    removeMember: (groupId: string, peerIdToRemove: string) => Promise<void>;
    onGroupMembersAdded: (callback: (data: { groupId: string, newMembers: any[] }) => void) => () => void;
    onGroupMemberRemoved: (callback: (data: { groupId: string, removedPeerId: string }) => void) => () => void;
  };
  dialog: {
    selectFiles: () => Promise<string[]>;
    selectFolder: () => Promise<string | null>;
  };
  fileTransfer: {
    offerFiles: (peerIds: string[], filePaths: string[], groupId?: string, message?: string) => Promise<LinkFileTransfer[]>;
    offerFolders: (peerIds: string[], folderPaths: string[], groupId?: string, message?: string) => Promise<LinkFileTransfer[]>;
    saveBuffer: (buffer: ArrayBuffer, mimeType: string) => Promise<string>;
    offerPastedBuffer: (peerIds: string[], buffer: ArrayBuffer, mimeType: string, groupId?: string, message?: string) => Promise<LinkFileTransfer[]>;
    respond: (transferId: string, accepted: boolean, savePath?: string) => Promise<void>;
    openFolder: (transferId: string) => Promise<boolean>;
    getThumbnail: (filePath: string) => Promise<string | null>;
    onOfferReceived: (callback: (transfer: LinkFileTransfer) => void) => () => void;
    onProgress: (callback: (transferId: string, bytesTransferred: number) => void) => () => void;
    onCompleted: (callback: (transferId: string) => void) => () => void;
    onDeclined: (callback: (transferId: string) => void) => () => void;
    onFailed: (callback: (transferId: string) => void) => () => void;
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
      flashFrame: (flag: boolean) => void;
    };
    link: LinkAPI;
  }
}
