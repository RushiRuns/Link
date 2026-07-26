import { ipcMain } from 'electron';
import { getOrGenerateIdentity, setDisplayName } from '../identity/identity.js';
import { peersStore } from '../storage/peers-store.js';
import { messageService } from '../messaging/message-service.js';
import { groupService } from '../groups/group-service.js';
import { fileTransferService } from '../file-transfer/file-transfer-service.js';
import { callSignalingService } from '../calls/call-signaling.js';

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

  // Messaging Handlers
  ipcMain.handle('messaging:send', async (_, peerId: string, content: string) => {
    return messageService.sendMessage(peerId, content);
  });

  // Groups Handlers
  ipcMain.handle('groups:create', async (_, name: string, memberPeerIds: string[]) => {
    return groupService.createGroup(name, memberPeerIds);
  });

  ipcMain.handle('groups:send-message', async (_, groupId: string, content: string) => {
    return groupService.sendGroupMessage(groupId, content);
  });

  // File Transfer Handlers
  ipcMain.handle('file-transfer:offer', async (_, peerId: string, filePath: string) => {
    if (!filePath) {
      return fileTransferService.selectAndOfferFile(peerId);
    }
    return fileTransferService.offerFile(peerId, filePath);
  });

  ipcMain.handle('file-transfer:respond', async (_, transferId: string, accepted: boolean, savePath?: string) => {
    return fileTransferService.respondToOffer(transferId, accepted, savePath);
  });

  // Call Handlers
  ipcMain.handle('calls:offer', async (_, peerId: string, mediaType: 'voice' | 'video', sdp: string) => {
    return callSignalingService.sendOffer(peerId, mediaType, sdp);
  });

  ipcMain.handle('calls:answer', async (_, callId: string, accepted: boolean, sdp?: string) => {
    return callSignalingService.sendAnswer(callId, accepted, sdp);
  });

  ipcMain.handle('calls:ice-candidate', async (_, callId: string, candidate: any) => {
    return callSignalingService.sendIceCandidate(callId, candidate);
  });

  ipcMain.handle('calls:end', async (_, callId: string) => {
    return callSignalingService.endCall(callId);
  });
}
