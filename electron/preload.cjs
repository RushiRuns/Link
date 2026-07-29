"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),
  ping: () => ipcRenderer.invoke("ping"),
  windowControl: (action) => ipcRenderer.send("window-control", action),
  flashFrame: (flag) => ipcRenderer.send("window:flash", flag)
});

contextBridge.exposeInMainWorld("link", {
  identity: {
    getIdentity: () => ipcRenderer.invoke("identity:get"),
    setDisplayName: (name) => ipcRenderer.invoke("identity:set-name", name)
  },
  peers: {
    getKnownPeers: () => ipcRenderer.invoke("peers:get-known"),
    onPeerConnected: (callback) => {
      const listener = (_, data) => callback(data);
      ipcRenderer.on("peer:connected", listener);
      return () => ipcRenderer.removeListener("peer:connected", listener);
    },
    onPeerDisconnected: (callback) => {
      const listener = (_, peerId) => callback(peerId);
      ipcRenderer.on("peer:disconnected", listener);
      return () => ipcRenderer.removeListener("peer:disconnected", listener);
    },
    onNoPeersFound: (callback) => {
      const listener = () => callback();
      ipcRenderer.on("discovery:no-peers-found", listener);
      return () => ipcRenderer.removeListener("discovery:no-peers-found", listener);
    }
  },
  messaging: {
    sendMessage: (peerId, content) => ipcRenderer.invoke("messaging:send", peerId, content),
    onMessageReceived: (callback) => {
      const listener = (_, msg) => callback(msg);
      ipcRenderer.on("message:received", listener);
      return () => ipcRenderer.removeListener("message:received", listener);
    },
    onMessageDelivered: (callback) => {
      const listener = (_, msgId) => callback(msgId);
      ipcRenderer.on("message:delivered", listener);
      return () => ipcRenderer.removeListener("message:delivered", listener);
    }
  },
  groups: {
    createGroup: (name, memberPeerIds) => ipcRenderer.invoke("groups:create", name, memberPeerIds),
    sendGroupMessage: (groupId, content) => ipcRenderer.invoke("groups:send-message", groupId, content),
    onGroupCreated: (callback) => {
      const listener = (_, group) => callback(group);
      ipcRenderer.on("group:created", listener);
      return () => ipcRenderer.removeListener("group:created", listener);
    },
    onGroupMessageReceived: (callback) => {
      const listener = (_, msg) => callback(msg);
      ipcRenderer.on("group-message:received", listener);
      return () => ipcRenderer.removeListener("group-message:received", listener);
    }
  },
  fileTransfer: {
    offerFile: (peerId, filePath) => ipcRenderer.invoke("file-transfer:offer", peerId, filePath),
    offerFolder: (peerId, groupId) => ipcRenderer.invoke("file-transfer:offer-folder", peerId, groupId),
    respond: (transferId, accepted, savePath) =>
      ipcRenderer.invoke("file-transfer:respond", transferId, accepted, savePath),
    openFolder: (transferId) => ipcRenderer.invoke("file-transfer:open-folder", transferId),
    onOfferReceived: (callback) => {
      const listener = (_, transfer) => callback(transfer);
      ipcRenderer.on("file-transfer:offer-received", listener);
      return () => ipcRenderer.removeListener("file-transfer:offer-received", listener);
    },
    onProgress: (callback) => {
      const listener = (_, { transferId, bytesTransferred }) => callback(transferId, bytesTransferred);
      ipcRenderer.on("file-transfer:progress", listener);
      return () => ipcRenderer.removeListener("file-transfer:progress", listener);
    },
    onCompleted: (callback) => {
      const listener = (_, transferId) => callback(transferId);
      ipcRenderer.on("file-transfer:completed", listener);
      return () => ipcRenderer.removeListener("file-transfer:completed", listener);
    }
  },
  calls: {
    offerCall: (peerId, mediaType, sdp) => ipcRenderer.invoke("calls:offer", peerId, mediaType, sdp),
    answerCall: (callId, accepted, sdp) => ipcRenderer.invoke("calls:answer", callId, accepted, sdp),
    sendIceCandidate: (callId, candidate) => ipcRenderer.invoke("calls:ice-candidate", callId, candidate),
    endCall: (callId) => ipcRenderer.invoke("calls:end", callId),
    onOfferReceived: (callback) => {
      const listener = (_, call) => callback(call);
      ipcRenderer.on("calls:offer-received", listener);
      return () => ipcRenderer.removeListener("calls:offer-received", listener);
    },
    onAnswerReceived: (callback) => {
      const listener = (_, data) => callback(data);
      ipcRenderer.on("calls:answer-received", listener);
      return () => ipcRenderer.removeListener("calls:answer-received", listener);
    },
    onIceCandidateReceived: (callback) => {
      const listener = (_, data) => callback(data);
      ipcRenderer.on("calls:ice-candidate", listener);
      return () => ipcRenderer.removeListener("calls:ice-candidate", listener);
    },
    onCallEnded: (callback) => {
      const listener = (_, callId) => callback(callId);
      ipcRenderer.on("calls:ended", listener);
      return () => ipcRenderer.removeListener("calls:ended", listener);
    }
  },
  theme: {
    onThemeChanged: (callback) => {
      const listener = (_, isDark) => callback(isDark);
      ipcRenderer.on("theme:changed", listener);
      return () => ipcRenderer.removeListener("theme:changed", listener);
    }
  }
});
