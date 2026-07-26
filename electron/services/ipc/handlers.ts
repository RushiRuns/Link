import { ipcMain } from 'electron';
import { getOrGenerateIdentity, setDisplayName } from '../identity/identity.js';
import { peersStore } from '../storage/peers-store.js';

export function registerIpcHandlers() {
  // Identity Handlers
  ipcMain.handle('identity:get', async () => {
    const identity = getOrGenerateIdentity();
    return {
      deviceId: identity.deviceId,
      displayName: identity.displayName,
      publicKey: identity.publicKeyBase64,
      publicKeyFingerprint: identity.publicKeyFingerprint,
      appVersion: identity.appVersion
    };
  });

  ipcMain.handle('identity:set-name', async (_, name: string) => {
    const updated = setDisplayName(name);
    return {
      deviceId: updated.deviceId,
      displayName: updated.displayName,
      publicKey: updated.publicKeyBase64,
      publicKeyFingerprint: updated.publicKeyFingerprint,
      appVersion: updated.appVersion
    };
  });

  // Peers Handlers
  ipcMain.handle('peers:get-known', async () => {
    return peersStore.getKnownPeers();
  });

  // Stubs for messaging, groups, file-transfer, and calls domains
  ipcMain.handle('messaging:send', async (_, _peerId: string, content: string) => {
    return {
      id: 'msg_' + Date.now(),
      senderId: getOrGenerateIdentity().deviceId,
      senderName: getOrGenerateIdentity().displayName,
      content,
      timestamp: Date.now(),
      deliveryStatus: 'sent'
    };
  });

  ipcMain.handle('groups:create', async (_, name: string, _memberPeerIds: string[]) => {
    return {
      id: 'group_' + Date.now(),
      name,
      creatorId: getOrGenerateIdentity().deviceId,
      members: [],
      messages: [],
      isActive: true,
      createdAt: Date.now()
    };
  });

  ipcMain.handle('groups:send-message', async (_, groupId: string, content: string) => {
    return {
      id: 'gmsg_' + Date.now(),
      groupId,
      senderId: getOrGenerateIdentity().deviceId,
      senderName: getOrGenerateIdentity().displayName,
      content,
      timestamp: Date.now(),
      deliveryStatus: 'sent'
    };
  });

  ipcMain.handle('file-transfer:offer', async (_, peerId: string, filePath: string) => {
    return {
      id: 'ft_' + Date.now(),
      direction: 'outgoing',
      peerId,
      fileName: filePath.split(/[/\\]/).pop() || 'file',
      fileSizeBytes: 0,
      mimeType: 'application/octet-stream',
      status: 'pending_accept',
      bytesTransferred: 0
    };
  });

  ipcMain.handle('file-transfer:respond', async (_, transferId: string, accepted: boolean) => {
    console.log(`[IPC] File transfer ${transferId} respond: ${accepted}`);
  });

  ipcMain.handle('calls:offer', async (_, peerId: string, mediaType: 'voice' | 'video') => {
    return {
      id: 'call_' + Date.now(),
      initiatorId: getOrGenerateIdentity().deviceId,
      peerId,
      mediaType,
      status: 'ringing',
      startedAt: Date.now()
    };
  });

  ipcMain.handle('calls:answer', async (_, callId: string, accepted: boolean) => {
    console.log(`[IPC] Call ${callId} answer: ${accepted}`);
  });

  ipcMain.handle('calls:end', async (_, callId: string) => {
    console.log(`[IPC] Call ${callId} ended`);
  });
}
