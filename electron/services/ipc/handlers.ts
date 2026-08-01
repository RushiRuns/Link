import { ipcMain, shell } from 'electron';
import fs from 'fs';
import { getOrGenerateIdentity, setDisplayName } from '../identity/identity.js';
import { peersStore } from '../storage/peers-store.js';
import { messageService } from '../messaging/message-service.js';
import { groupService } from '../groups/group-service.js';
import { fileTransferService } from '../file-transfer/file-transfer-service.js';
import { callSignalingService } from '../calls/call-signaling.js';
import { connectionManager } from '../network/connection-manager.js';
import { messageStore } from '../storage/message-store.js';

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
  ipcMain.handle('messaging:send', async (_, peerId: string, content: string, replyToMessageId?: string) => {
    return messageService.sendMessage(peerId, content, replyToMessageId);
  });

  ipcMain.handle('messaging:send-typing', async (_, peerId: string, groupId?: string) => {
    return messageService.sendTypingSignal(peerId, groupId);
  });

  ipcMain.handle('messaging:edit-message', async (_, peerId: string, messageId: string, newContent: string) => {
    return messageService.editMessage(peerId, messageId, newContent);
  });

  ipcMain.handle('messaging:delete-message', async (_, peerId: string, messageId: string) => {
    return messageService.deleteMessage(peerId, messageId);
  });

  ipcMain.handle('messages:load', async () => {
    return messageStore.loadMessages();
  });

  ipcMain.handle('messages:save', async (_, data: Record<string, any[]>) => {
    return messageStore.saveMessages(data);
  });

  // Groups Handlers
  ipcMain.handle('groups:create', async (_, name: string, memberPeerIds: string[]) => {
    return groupService.createGroup(name, memberPeerIds);
  });

  ipcMain.handle('groups:send-message', async (_, groupId: string, content: string, replyToMessageId?: string) => {
    return groupService.sendGroupMessage(groupId, content, replyToMessageId);
  });

  ipcMain.handle('groups:rename', async (_, groupId: string, newName: string) => {
    return groupService.renameGroup(groupId, newName);
  });

  ipcMain.handle('groups:delete', async (_, groupId: string) => {
    return groupService.deleteGroup(groupId);
  });

  ipcMain.handle('groups:add-members', async (_, groupId: string, memberPeerIds: string[]) => {
    return groupService.addMembers(groupId, memberPeerIds);
  });

  ipcMain.handle('groups:remove-member', async (_, groupId: string, peerIdToRemove: string) => {
    return groupService.removeMember(groupId, peerIdToRemove);
  });

  // Dialog Handlers
  ipcMain.handle('dialog:select-files', async () => {
    return fileTransferService.selectFiles();
  });

  ipcMain.handle('dialog:select-folder', async () => {
    return fileTransferService.selectFolder();
  });

  // File Transfer Handlers
  ipcMain.handle('file-transfer:offer-files', async (_, peerIds: string[], filePaths: string[], groupId?: string, message?: string) => {
    return fileTransferService.offerFiles(peerIds, filePaths, groupId, message);
  });

  ipcMain.handle('file-transfer:offer-folders', async (_, peerIds: string[], folderPaths: string[], groupId?: string, message?: string) => {
    return fileTransferService.offerFolders(peerIds, folderPaths, groupId, message);
  });

  ipcMain.handle('file-transfer:save-buffer', async (_, buffer: ArrayBuffer, mimeType: string) => {
    return fileTransferService.savePastedBuffer(buffer, mimeType);
  });

  ipcMain.handle('file-transfer:offer-pasted-buffer', async (_, peerIds: string[], buffer: ArrayBuffer, mimeType: string, groupId?: string, message?: string) => {
    return fileTransferService.offerPastedBufferToMultiple(peerIds, buffer, mimeType, groupId, message);
  });

  ipcMain.handle('file-transfer:respond', async (_, transferId: string, accepted: boolean, savePath?: string) => {
    return fileTransferService.respondToOffer(transferId, accepted, savePath);
  });

  ipcMain.handle('file-transfer:open-folder', async (_, transferId: string) => {
    const state = fileTransferService.getTransferState(transferId);
    if (!state) return false;
    
    const targetPath = state.savePath || state.filePath;
    if (targetPath && fs.existsSync(targetPath)) {
      const errorMsg = await shell.openPath(targetPath);
      if (errorMsg) {
        console.error(`[FileTransfer] Error opening path ${targetPath}:`, errorMsg);
        return false;
      }
      return true;
    }
    return false;
  });

  ipcMain.handle('file-transfer:get-thumbnail', async (_, filePath: string) => {
    return fileTransferService.getFileThumbnail(filePath);
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
