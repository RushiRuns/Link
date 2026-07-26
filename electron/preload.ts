import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  ping: () => ipcRenderer.invoke('ping'),
  windowControl: (action: 'minimize' | 'maximize' | 'close') => ipcRenderer.send('window-control', action)
});

contextBridge.exposeInMainWorld('link', {
  identity: {
    getIdentity: () => ipcRenderer.invoke('identity:get'),
    setDisplayName: (name: string) => ipcRenderer.invoke('identity:set-name', name)
  },
  peers: {
    getKnownPeers: () => ipcRenderer.invoke('peers:get-known'),
    onPeerConnected: (callback: (peer: any) => void) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('peer:connected', listener);
      return () => ipcRenderer.removeListener('peer:connected', listener);
    },
    onPeerDisconnected: (callback: (peerId: string) => void) => {
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
    sendMessage: (peerId: string, content: string) => ipcRenderer.invoke('messaging:send', peerId, content),
    onMessageReceived: (callback: (message: any) => void) => {
      const listener = (_: any, msg: any) => callback(msg);
      ipcRenderer.on('message:received', listener);
      return () => ipcRenderer.removeListener('message:received', listener);
    },
    onMessageDelivered: (callback: (messageId: string) => void) => {
      const listener = (_: any, msgId: string) => callback(msgId);
      ipcRenderer.on('message:delivered', listener);
      return () => ipcRenderer.removeListener('message:delivered', listener);
    }
  },
  groups: {
    createGroup: (name: string, memberPeerIds: string[]) => ipcRenderer.invoke('groups:create', name, memberPeerIds),
    sendGroupMessage: (groupId: string, content: string) => ipcRenderer.invoke('groups:send-message', groupId, content),
    onGroupCreated: (callback: (group: any) => void) => {
      const listener = (_: any, group: any) => callback(group);
      ipcRenderer.on('group:created', listener);
      return () => ipcRenderer.removeListener('group:created', listener);
    },
    onGroupMessageReceived: (callback: (message: any) => void) => {
      const listener = (_: any, msg: any) => callback(msg);
      ipcRenderer.on('group-message:received', listener);
      return () => ipcRenderer.removeListener('group-message:received', listener);
    }
  },
  fileTransfer: {
    offerFile: (peerId: string, filePath: string) => ipcRenderer.invoke('file-transfer:offer', peerId, filePath),
    respond: (transferId: string, accepted: boolean, savePath?: string) =>
      ipcRenderer.invoke('file-transfer:respond', transferId, accepted, savePath),
    onOfferReceived: (callback: (transfer: any) => void) => {
      const listener = (_: any, transfer: any) => callback(transfer);
      ipcRenderer.on('file-transfer:offer-received', listener);
      return () => ipcRenderer.removeListener('file-transfer:offer-received', listener);
    },
    onProgress: (callback: (transferId: string, bytesTransferred: number) => void) => {
      const listener = (_: any, { transferId, bytesTransferred }: any) => callback(transferId, bytesTransferred);
      ipcRenderer.on('file-transfer:progress', listener);
      return () => ipcRenderer.removeListener('file-transfer:progress', listener);
    },
    onCompleted: (callback: (transferId: string) => void) => {
      const listener = (_: any, transferId: string) => callback(transferId);
      ipcRenderer.on('file-transfer:completed', listener);
      return () => ipcRenderer.removeListener('file-transfer:completed', listener);
    }
  },
  calls: {
    offerCall: (peerId: string, mediaType: 'voice' | 'video', sdp: string) => ipcRenderer.invoke('calls:offer', peerId, mediaType, sdp),
    answerCall: (callId: string, accepted: boolean, sdp?: string) => ipcRenderer.invoke('calls:answer', callId, accepted, sdp),
    sendIceCandidate: (callId: string, candidate: any) => ipcRenderer.invoke('calls:ice-candidate', callId, candidate),
    endCall: (callId: string) => ipcRenderer.invoke('calls:end', callId),
    onOfferReceived: (callback: (call: any) => void) => {
      const listener = (_: any, call: any) => callback(call);
      ipcRenderer.on('calls:offer-received', listener);
      return () => ipcRenderer.removeListener('calls:offer-received', listener);
    },
    onAnswerReceived: (callback: (data: any) => void) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('calls:answer-received', listener);
      return () => ipcRenderer.removeListener('calls:answer-received', listener);
    },
    onIceCandidateReceived: (callback: (data: any) => void) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('calls:ice-candidate', listener);
      return () => ipcRenderer.removeListener('calls:ice-candidate', listener);
    },
    onCallEnded: (callback: (callId: string) => void) => {
      const listener = (_: any, callId: string) => callback(callId);
      ipcRenderer.on('calls:ended', listener);
      return () => ipcRenderer.removeListener('calls:ended', listener);
    }
  },
  theme: {
    onThemeChanged: (callback: (isDark: boolean) => void) => {
      const listener = (_: any, isDark: boolean) => callback(isDark);
      ipcRenderer.on('theme:changed', listener);
      return () => ipcRenderer.removeListener('theme:changed', listener);
    }
  }
});
