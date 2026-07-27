import { create } from 'zustand';
import { LinkFileTransfer } from '../types/ipc';

interface FileTransferState {
  transfers: Map<string, LinkFileTransfer>;
  incomingOffer: LinkFileTransfer | null;
  addTransfer: (transfer: LinkFileTransfer) => void;
  updateProgress: (transferId: string, bytesTransferred: number) => void;
  setTransferStatus: (transferId: string, status: LinkFileTransfer['status']) => void;
  clearIncomingOffer: () => void;
  offerFile: (peerId: string, groupId?: string) => Promise<LinkFileTransfer | undefined>;
  respondToOffer: (transferId: string, accepted: boolean, savePath?: string) => Promise<void>;
  openTransferFolder: (transferId: string) => Promise<boolean>;
  initListeners: () => () => void;
}

export const useFileTransferStore = create<FileTransferState>((set, get) => ({
  transfers: new Map(),
  incomingOffer: null,

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

  clearIncomingOffer: () => set({ incomingOffer: null }),

  offerFile: async (peerId) => {
    if (window.link?.fileTransfer) {
      try {
        const transfer = await window.link.fileTransfer.offerFile(peerId, '');
        if (transfer) {
          get().addTransfer(transfer);
          return transfer;
        }
      } catch (err) {
        console.error('[FileTransferStore] Error offering file:', err);
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
      set({ incomingOffer: transfer });
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
