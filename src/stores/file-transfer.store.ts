import { create } from 'zustand';
import { LinkFileTransfer } from '../types/ipc';
import { playNotificationSound } from '../utils/audio';

interface FileTransferState {
  transfers: Map<string, LinkFileTransfer>;
  incomingOffer: LinkFileTransfer | null;
  incomingOffersQueue: LinkFileTransfer[];
  addTransfer: (transfer: LinkFileTransfer) => void;
  updateProgress: (transferId: string, bytesTransferred: number) => void;
  setTransferStatus: (transferId: string, status: LinkFileTransfer['status']) => void;
  clearIncomingOffer: () => void;
  clearPeerTransfers: (peerId: string) => void;
  offerFile: (peerId: string, groupId?: string) => Promise<LinkFileTransfer | undefined>;
  offerFolder: (peerId: string, groupId?: string) => Promise<LinkFileTransfer | undefined>;
  offerFileToGroup: (peerIds: string[], groupId?: string) => Promise<LinkFileTransfer[] | undefined>;
  offerFolderToGroup: (peerIds: string[], groupId?: string) => Promise<LinkFileTransfer[] | undefined>;
  offerPastedFileToGroup: (peerIds: string[], filePath: string, groupId?: string) => Promise<LinkFileTransfer[] | undefined>;
  offerPastedBufferToGroup: (peerIds: string[], buffer: ArrayBuffer, mimeType: string, groupId?: string) => Promise<LinkFileTransfer[] | undefined>;
  respondToOffer: (transferId: string, accepted: boolean, savePath?: string) => Promise<void>;
  openTransferFolder: (transferId: string) => Promise<boolean>;
  initListeners: () => () => void;
}

export const useFileTransferStore = create<FileTransferState>((set, get) => ({
  transfers: new Map(),
  incomingOffer: null,
  incomingOffersQueue: [],

  addTransfer: (transfer) => {
    set((state) => {
      const nextMap = new Map(state.transfers);
      nextMap.set(transfer.id, transfer);
      return { transfers: nextMap };
    });
  },

  updateProgress: (transferId, bytesTransferred) => {
    set((state) => {
      const existing = state.transfers.get(transferId);
      if (existing) {
        const nextMap = new Map(state.transfers);
        nextMap.set(transferId, {
          ...existing,
          bytesTransferred,
          status: 'transferring'
        });
        return { transfers: nextMap };
      }
      return state;
    });
  },

  setTransferStatus: (transferId, status) => {
    set((state) => {
      const existing = state.transfers.get(transferId);
      if (existing) {
        const nextMap = new Map(state.transfers);
        nextMap.set(transferId, { ...existing, status });
        return { transfers: nextMap };
      }
      return state;
    });
  },

  clearIncomingOffer: () => set((state) => {
    if (state.incomingOffersQueue.length > 0) {
      const nextOffer = state.incomingOffersQueue[0];
      return { 
        incomingOffer: nextOffer,
        incomingOffersQueue: state.incomingOffersQueue.slice(1)
      };
    }
    return { incomingOffer: null };
  }),

  clearPeerTransfers: (peerId) => {
    set((state) => {
      const nextMap = new Map(state.transfers);
      for (const [key, value] of nextMap.entries()) {
        if (value.peerId === peerId) {
          nextMap.delete(key);
        }
      }
      return { transfers: nextMap };
    });
  },

  offerFile: async (peerId) => {
    if (window.link?.fileTransfer) {
      try {
        const transfers = await window.link.fileTransfer.offerFile(peerId, '');
        if (transfers) {
          if (Array.isArray(transfers)) {
            transfers.forEach(t => get().addTransfer(t));
            return transfers[0]; // Return the first one or adjust return type if needed
          } else {
            get().addTransfer(transfers);
            return transfers;
          }
        }
      } catch (err) {
        console.error('[FileTransferStore] Error offering file(s):', err);
      }
    }
    return undefined;
  },

  offerFolder: async (peerId, groupId) => {
    if (window.link?.fileTransfer) {
      try {
        const transfer = await window.link.fileTransfer.offerFolder(peerId, groupId || '');
        if (transfer) {
          get().addTransfer(transfer);
          return transfer;
        }
      } catch (err) {
        console.error('[FileTransferStore] Error offering folder:', err);
      }
    }
    return undefined;
  },

  offerFileToGroup: async (peerIds, groupId) => {
    if (window.link?.fileTransfer) {
      try {
        const transfers = await window.link.fileTransfer.offerFileToMultiple(peerIds, groupId);
        if (transfers && Array.isArray(transfers)) {
          transfers.forEach(t => get().addTransfer(t));
          return transfers;
        }
      } catch (err) {
        console.error('[FileTransferStore] Error offering file to multiple:', err);
      }
    }
    return undefined;
  },

  offerFolderToGroup: async (peerIds, groupId) => {
    if (window.link?.fileTransfer) {
      try {
        const transfers = await window.link.fileTransfer.offerFolderToMultiple(peerIds, groupId);
        if (transfers && Array.isArray(transfers)) {
          transfers.forEach(t => get().addTransfer(t));
          return transfers;
        }
      } catch (err) {
        console.error('[FileTransferStore] Error offering folder to multiple:', err);
      }
    }
    return undefined;
  },

  offerPastedFileToGroup: async (peerIds, filePath, groupId) => {
    if (window.link?.fileTransfer) {
      try {
        const transfers = await window.link.fileTransfer.offerPastedFileToMultiple(peerIds, filePath, groupId);
        if (transfers && Array.isArray(transfers)) {
          transfers.forEach(t => get().addTransfer(t));
          return transfers;
        }
      } catch (err) {
        console.error('[FileTransferStore] Error offering pasted file to multiple:', err);
      }
    }
    return undefined;
  },

  offerPastedBufferToGroup: async (peerIds, buffer, mimeType, groupId) => {
    if (window.link?.fileTransfer) {
      try {
        const transfers = await window.link.fileTransfer.offerPastedBufferToMultiple(peerIds, buffer, mimeType, groupId);
        if (transfers && Array.isArray(transfers)) {
          transfers.forEach(t => get().addTransfer(t));
          return transfers;
        }
      } catch (err) {
        console.error('[FileTransferStore] Error offering pasted buffer to multiple:', err);
      }
    }
    return undefined;
  },

  respondToOffer: async (transferId, accepted, savePath) => {
    if (window.link?.fileTransfer) {
      try {
        await window.link.fileTransfer.respond(transferId, accepted, savePath);
        get().setTransferStatus(transferId, accepted ? 'transferring' : 'declined');
        get().clearIncomingOffer();
      } catch (err) {
        console.error('[FileTransferStore] Error responding to offer:', err);
      }
    }
  },

  openTransferFolder: async (transferId) => {
    if (window.link?.fileTransfer) {
      try {
        return await window.link.fileTransfer.openFolder(transferId);
      } catch (err) {
        console.error('[FileTransferStore] Error opening transfer folder:', err);
      }
    }
    return false;
  },

  initListeners: () => {
    if (!window.link?.fileTransfer) return () => {};

    const cleanOffer = window.link.fileTransfer.onOfferReceived((transfer) => {
      get().addTransfer(transfer);
      
      set((state) => {
        if (!state.incomingOffer) {
          return { incomingOffer: transfer };
        }
        return { incomingOffersQueue: [...state.incomingOffersQueue, transfer] };
      });
      
      window.electron?.flashFrame(true);
      playNotificationSound();
    });

    const cleanProgress = window.link.fileTransfer.onProgress((transferId, bytesTransferred) => {
      get().updateProgress(transferId, bytesTransferred);
    });

    const cleanCompleted = window.link.fileTransfer.onCompleted((transferId) => {
      get().setTransferStatus(transferId, 'completed');
    });

    return () => {
      cleanOffer();
      cleanProgress();
      cleanCompleted();
    };
  }
}));
