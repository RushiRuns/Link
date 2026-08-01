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
  offerFiles: (peerIds: string[], filePaths: string[], groupId?: string, message?: string) => Promise<LinkFileTransfer[] | undefined>;
  offerFolders: (peerIds: string[], folderPaths: string[], groupId?: string, message?: string) => Promise<LinkFileTransfer[] | undefined>;
  offerPastedBuffer: (peerIds: string[], buffer: ArrayBuffer, mimeType: string, groupId?: string, message?: string) => Promise<LinkFileTransfer[] | undefined>;
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

  offerFiles: async (peerIds, filePaths, groupId, message) => {
    if (window.link?.fileTransfer) {
      try {
        const transfers = await window.link.fileTransfer.offerFiles(peerIds, filePaths, groupId, message);
        if (transfers && Array.isArray(transfers)) {
          transfers.forEach(t => get().addTransfer(t));
          return transfers;
        }
      } catch (err) {
        console.error('[FileTransferStore] Error offering files:', err);
      }
    }
    return undefined;
  },

  offerFolders: async (peerIds, folderPaths, groupId, message) => {
    if (window.link?.fileTransfer) {
      try {
        const transfers = await window.link.fileTransfer.offerFolders(peerIds, folderPaths, groupId, message);
        if (transfers && Array.isArray(transfers)) {
          transfers.forEach(t => get().addTransfer(t));
          return transfers;
        }
      } catch (err) {
        console.error('[FileTransferStore] Error offering folders:', err);
      }
    }
    return undefined;
  },

  offerPastedBuffer: async (peerIds, buffer, mimeType, groupId, message) => {
    if (window.link?.fileTransfer) {
      try {
        const transfers = await window.link.fileTransfer.offerPastedBuffer(peerIds, buffer, mimeType, groupId, message);
        if (transfers && Array.isArray(transfers)) {
          transfers.forEach(t => get().addTransfer(t));
          return transfers;
        }
      } catch (err) {
        console.error('[FileTransferStore] Error offering pasted buffer:', err);
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

    const cleanDeclined = window.link.fileTransfer.onDeclined((transferId) => {
      get().setTransferStatus(transferId, 'declined');
    });

    const cleanFailed = window.link.fileTransfer.onFailed((transferId) => {
      get().setTransferStatus(transferId, 'failed');
    });

    return () => {
      cleanOffer();
      cleanProgress();
      cleanCompleted();
      cleanDeclined();
      cleanFailed();
    };
  }
}));
