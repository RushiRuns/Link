import { ipcMain, shell } from 'electron';
import fs from 'fs';
import { getOrGenerateIdentity, setDisplayName } from '../identity/identity.js';
import { peersStore } from '../storage/peers-store.js';
import { messageService } from '../messaging/message-service.js';
import { groupService } from '../groups/group-service.js';
import { fileTransferService } from '../file-transfer/file-transfer-service.js';
import { callSignalingService } from '../calls/call-signaling.js';
import { connectionManager } from '../network/connection-manager.js';

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
    const peers = peersStore.getKnownPeers();
    return peers.map((p) => {
      const activeConn = connectionManager.getActiveConnection(p.id);
      return {
        ...p,
        status: activeConn ? 'online' : 'offline',
        networkAddress: activeConn?.socket.remoteAddress,
        listeningPort: activeConn?.socket.remotePort
      };
    });
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

  ipcMain.handle('file-transfer:offer-folder', async (_, peerId: string, groupId?: string) => {
    return fileTransferService.selectAndOfferFolder(peerId, groupId);
  });

  ipcMain.handle('file-transfer:save-buffer', async (_, buffer: ArrayBuffer, mimeType: string) => {
    return fileTransferService.savePastedBuffer(buffer, mimeType);
  });

  ipcMain.handle('file-transfer:respond', async (_, transferId: string, accepted: boolean, savePath?: string) => {
    return fileTransferService.respondToOffer(transferId, accepted, savePath);
  });

  ipcMain.handle('file-transfer:open-folder', async (_, transferId: string) => {
    const state = fileTransferService.getTransferState(transferId);
    if (!state) return false;
    
    const targetPath = state.savePath || state.filePath;
    if (targetPath && fs.existsSync(targetPath)) {
      shell.showItemInFolder(targetPath);
      return true;
    }
    return false;
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
