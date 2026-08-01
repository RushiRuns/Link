export type PeerStatus = 'online' | 'offline' | 'version_mismatch';

export interface LinkIdentity {
  deviceId: string;
  displayName: string;
  publicKey: string;
  publicKeyFingerprint: string;
  appVersion: string;
}

export interface LinkPeer {
  id: string;
  displayName: string;
  publicKey: string;
  publicKeyFingerprint: string;
  appVersion: string;
  status: PeerStatus;
  networkAddress?: string;
  listeningPort?: number;
  lastSeen?: string;
  isKnown?: boolean;
}

export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'failed';

export interface LinkTypingEvent {
  peerId: string;
  conversationId?: string;
  groupId?: string;
}

export interface LinkMessageEditEvent {
  messageId: string;
  newContent: string;
}

export interface LinkMessageDeleteEvent {
  messageId: string;
}

export interface LinkMessage {
  id: string;
  conversationId?: string;
  groupId?: string;
  senderId: string;
  senderName: string;
  content: string;
  replyToMessageId?: string;
  timestamp: number;
  deliveryStatus: DeliveryStatus;
}

export interface GroupMember {
  peerId: string;
  displayName: string;
  publicKey: string;
  status: PeerStatus;
}

export interface LinkGroup {
  id: string;
  name: string;
  creatorId: string;
  members: GroupMember[];
  messages: LinkMessage[];
  isActive: boolean;
  createdAt: number;
}

export type FileTransferStatus =
  | 'pending_accept'
  | 'transferring'
  | 'completed'
  | 'declined'
  | 'failed'
  | 'cancelled';

export interface LinkFileTransfer {
  id: string;
  direction: 'outgoing' | 'incoming';
  peerId: string;
  groupId?: string;
  transferBatchId?: string;
  fileName: string;
  fileSizeBytes: number;
  isFolder?: boolean;
  mimeType: string;
  status: FileTransferStatus;
  bytesTransferred: number;
  savePath?: string;
  startedAt?: number;
  completedAt?: number;
  message?: string;
}

export type CallMediaType = 'voice' | 'video';
export type CallStatus = 'ringing' | 'active' | 'ended' | 'declined' | 'failed';

export interface LinkCall {
  id: string;
  initiatorId: string;
  peerId: string;
  mediaType: CallMediaType;
  status: CallStatus;
  startedAt?: number;
  endedAt?: number;
}
