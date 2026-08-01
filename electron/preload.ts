import { contextBridge, ipcRenderer } from 'electron';

type EventCallback<T = any> = (data: T) => void;

contextBridge.exposeInMainWorld('electron', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  ping: () => ipcRenderer.invoke('ping'),
  windowControl: (action: 'minimize' | 'maximize' | 'close') => ipcRenderer.send('window-control', action),
  flashFrame: (flag: boolean) => ipcRenderer.send('window:flash', flag)
});

contextBridge.exposeInMainWorld('link', {
  identity: {
    getIdentity: () => ipcRenderer.invoke('identity:get'),
    setDisplayName: (name: string) => ipcRenderer.invoke('identity:set-name', name)
  },
  peers: {
    getKnownPeers: () => ipcRenderer.invoke('peers:get-known'),
    onPeerConnected: (callback: EventCallback) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('peer:connected', listener);
      return () => ipcRenderer.removeListener('peer:connected', listener);
    },
    onPeerDisconnected: (callback: EventCallback<string>) => {
      const listener = (_: any, peerId: string) => callback(peerId);
      ipcRenderer.on('peer:disconnected', listener);
      return () => ipcRenderer.removeListener('peer:disconnected', listener);
    },
    onNoPeersFound: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('discovery:no-peers-found', listener);
      return () => ipcRenderer.removeListener('discovery:no-peers-found', listener);
    }
  },
  messaging: {
    loadMessages: () => ipcRenderer.invoke('messages:load'),
    saveMessages: (data: any) => ipcRenderer.invoke('messages:save', data),
    sendMessage: (peerId: string, content: string, replyToMessageId?: string) => ipcRenderer.invoke('messaging:send', peerId, content, replyToMessageId),
    onMessageReceived: (callback: EventCallback) => {
      const listener = (_: any, msg: any) => callback(msg);
      ipcRenderer.on('message:received', listener);
      return () => ipcRenderer.removeListener('message:received', listener);
    },
    onMessageDelivered: (callback: EventCallback<string>) => {
      const listener = (_: any, msgId: string) => callback(msgId);
      ipcRenderer.on('message:delivered', listener);
      return () => ipcRenderer.removeListener('message:delivered', listener);
    },
    sendTypingSignal: (peerId: string, groupId?: string) => ipcRenderer.invoke('messaging:send-typing', peerId, groupId),
    onTypingReceived: (callback: EventCallback) => {
      const listener = (_: any, event: any) => callback(event);
      ipcRenderer.on('message:typing', listener);
      return () => ipcRenderer.removeListener('message:typing', listener);
    },
    sendEditMessage: (peerId: string, messageId: string, newContent: string) => ipcRenderer.invoke('messaging:edit-message', peerId, messageId, newContent),
    sendDeleteMessage: (peerId: string, messageId: string) => ipcRenderer.invoke('messaging:delete-message', peerId, messageId),
    onMessageEdited: (callback: EventCallback) => {
      const listener = (_: any, event: any) => callback(event);
      ipcRenderer.on('message:edited', listener);
      return () => ipcRenderer.removeListener('message:edited', listener);
    },
    onMessageDeleted: (callback: EventCallback) => {
      const listener = (_: any, event: any) => callback(event);
      ipcRenderer.on('message:deleted', listener);
      return () => ipcRenderer.removeListener('message:deleted', listener);
    }
  },
  groups: {
    createGroup: (name: string, memberPeerIds: string[]) => ipcRenderer.invoke('groups:create', name, memberPeerIds),
    sendGroupMessage: (groupId: string, content: string) => ipcRenderer.invoke('groups:send-message', groupId, content),
    onGroupCreated: (callback: EventCallback) => {
      const listener = (_: any, group: any) => callback(group);
      ipcRenderer.on('group:created', listener);
      return () => ipcRenderer.removeListener('group:created', listener);
    },
    onGroupMessageReceived: (callback: EventCallback) => {
      const listener = (_: any, msg: any) => callback(msg);
      ipcRenderer.on('group-message:received', listener);
      return () => ipcRenderer.removeListener('group-message:received', listener);
    },
    renameGroup: (groupId: string, newName: string) => ipcRenderer.invoke('groups:rename', groupId, newName),
    deleteGroup: (groupId: string) => ipcRenderer.invoke('groups:delete', groupId),
    onGroupRenamed: (callback: EventCallback) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('group:renamed', listener);
      return () => ipcRenderer.removeListener('group:renamed', listener);
    },
    onGroupDeleted: (callback: EventCallback) => {
      const listener = (_: any, groupId: string) => callback(groupId);
      ipcRenderer.on('group:deleted', listener);
      return () => ipcRenderer.removeListener('group:deleted', listener);
    },
    addMembers: (groupId: string, memberPeerIds: string[]) => ipcRenderer.invoke('groups:add-members', groupId, memberPeerIds),
    removeMember: (groupId: string, peerIdToRemove: string) => ipcRenderer.invoke('groups:remove-member', groupId, peerIdToRemove),
    onGroupMembersAdded: (callback: EventCallback) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('group:members-added', listener);
      return () => ipcRenderer.removeListener('group:members-added', listener);
    },
    onGroupMemberRemoved: (callback: EventCallback) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('group:member-removed', listener);
      return () => ipcRenderer.removeListener('group:member-removed', listener);
    }
  },
  dialog: {
    selectFiles: () => ipcRenderer.invoke('dialog:select-files'),
    selectFolder: () => ipcRenderer.invoke('dialog:select-folder')
  },
  fileTransfer: {
    offerFiles: (peerIds: string[], filePaths: string[], groupId?: string, message?: string) => 
      ipcRenderer.invoke('file-transfer:offer-files', peerIds, filePaths, groupId, message),
    offerFolders: (peerIds: string[], folderPaths: string[], groupId?: string, message?: string) => 
      ipcRenderer.invoke('file-transfer:offer-folders', peerIds, folderPaths, groupId, message),
    saveBuffer: (buffer: ArrayBuffer, mimeType: string) => 
      ipcRenderer.invoke('file-transfer:save-buffer', buffer, mimeType),
    offerPastedBuffer: (peerIds: string[], buffer: ArrayBuffer, mimeType: string, groupId?: string, message?: string) => 
      ipcRenderer.invoke('file-transfer:offer-pasted-buffer', peerIds, buffer, mimeType, groupId, message),
    respond: (transferId: string, accepted: boolean, savePath?: string) => 
      ipcRenderer.invoke('file-transfer:respond', transferId, accepted, savePath),
    openFolder: (transferId: string) => ipcRenderer.invoke('file-transfer:open-folder', transferId),
    getThumbnail: (filePath: string) => ipcRenderer.invoke('file-transfer:get-thumbnail', filePath),
    onOfferReceived: (callback: EventCallback) => {
      const listener = (_: any, transfer: any) => callback(transfer);
      ipcRenderer.on('file-transfer:offer-received', listener);
      return () => ipcRenderer.removeListener('file-transfer:offer-received', listener);
    },
    onProgress: (callback: (transferId: string, bytesTransferred: number) => void) => {
      const listener = (_: any, { transferId, bytesTransferred }: any) => callback(transferId, bytesTransferred);
      ipcRenderer.on('file-transfer:progress', listener);
      return () => ipcRenderer.removeListener('file-transfer:progress', listener);
    },
    onCompleted: (callback: EventCallback<string>) => {
      const listener = (_: any, transferId: string) => callback(transferId);
      ipcRenderer.on('file-transfer:completed', listener);
      return () => ipcRenderer.removeListener('file-transfer:completed', listener);
    },
    onDeclined: (callback: EventCallback<string>) => {
      const listener = (_: any, transferId: string) => callback(transferId);
      ipcRenderer.on('file-transfer:declined', listener);
      return () => ipcRenderer.removeListener('file-transfer:declined', listener);
    },
    onFailed: (callback: EventCallback<string>) => {
      const listener = (_: any, transferId: string) => callback(transferId);
      ipcRenderer.on('file-transfer:failed', listener);
      return () => ipcRenderer.removeListener('file-transfer:failed', listener);
    }
  },
  calls: {
    offerCall: (peerId: string, mediaType: 'voice' | 'video', sdp: string) => ipcRenderer.invoke('calls:offer', peerId, mediaType, sdp),
    answerCall: (callId: string, accepted: boolean, sdp?: string) => ipcRenderer.invoke('calls:answer', callId, accepted, sdp),
    sendIceCandidate: (callId: string, candidate: any) => ipcRenderer.invoke('calls:ice-candidate', callId, candidate),
    endCall: (callId: string) => ipcRenderer.invoke('calls:end', callId),
    onOfferReceived: (callback: EventCallback) => {
      const listener = (_: any, call: any) => callback(call);
      ipcRenderer.on('calls:offer-received', listener);
      return () => ipcRenderer.removeListener('calls:offer-received', listener);
    },
    onAnswerReceived: (callback: EventCallback) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('calls:answer-received', listener);
      return () => ipcRenderer.removeListener('calls:answer-received', listener);
    },
    onIceCandidateReceived: (callback: EventCallback) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('calls:ice-candidate', listener);
      return () => ipcRenderer.removeListener('calls:ice-candidate', listener);
    },
    onCallEnded: (callback: EventCallback<string>) => {
      const listener = (_: any, callId: string) => callback(callId);
      ipcRenderer.on('calls:ended', listener);
      return () => ipcRenderer.removeListener('calls:ended', listener);
    }
  },
  theme: {
    onThemeChanged: (callback: EventCallback<boolean>) => {
      const listener = (_: any, isDark: boolean) => callback(isDark);
      ipcRenderer.on('theme:changed', listener);
      return () => ipcRenderer.removeListener('theme:changed', listener);
    }
  }
});
