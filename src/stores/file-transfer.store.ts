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
  loadFromDisk: () => Promise<void>;
  initListeners: () => () => void;
}

export const useFileTransferStore = create<FileTransferState>((set, get) => ({
  transfers: new Map(),
  incomingOffer: null,
  incomingOffersQueue: [],

  addTransfer: (transfer) => {
    const transferWithTimestamp: LinkFileTransfer = {
      ...transfer,
      startedAt: transfer.startedAt || Date.now(),
      // Always stamp with local clock at insertion time for timeline sorting.
      // This avoids remote clock skew pushing transfers to wrong positions.
      localArrivalTimestamp: transfer.localArrivalTimestamp || Date.now()
    };
    set((state) => {
      const nextMap = new Map(state.transfers);
      nextMap.set(transferWithTimestamp.id, transferWithTimestamp);
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

  loadFromDisk: async () => {
    if (window.link?.fileTransfer?.loadTransfers) {
      console.log('[FileTransferStore] loadFromDisk: loading transfers from disk...');
      try {
        const data = await window.link.fileTransfer.loadTransfers();
        const map = new Map<string, LinkFileTransfer>();
        let downgradedCount = 0;
        
        for (const [id, transfer] of Object.entries(data)) {
          let loadedTransfer = { ...transfer };
          if (loadedTransfer.status === 'pending_accept' || loadedTransfer.status === 'transferring') {
            loadedTransfer.status = 'failed';
            downgradedCount++;
          }
          map.set(id, loadedTransfer);
        }
        
        set({ transfers: map });
        console.log(`[FileTransferStore] loadFromDisk: restored ${map.size} transfers (${downgradedCount} downgraded to failed)`);
      } catch (err) {
        console.error('[FileTransferStore] loadFromDisk: ERROR —', err);
      }
    } else {
      console.log('[FileTransferStore] loadFromDisk: no IPC bridge available, skipping');
    }
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

let saveTimeout: any;
let lastFingerprint = '';

useFileTransferStore.subscribe((state) => {
  // Create a fingerprint of IDs + statuses
  const entries = Array.from(state.transfers.values());
  const currentFingerprint = entries.map(t => `${t.id}:${t.status}`).sort().join('|');

  if (currentFingerprint !== lastFingerprint) {
    lastFingerprint = currentFingerprint;
    
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      if (window.link?.fileTransfer?.saveTransfers) {
        const record: Record<string, LinkFileTransfer> = {};
        for (const [id, transfer] of state.transfers.entries()) {
          record[id] = transfer;
        }
        try {
          console.log(`[FileTransferStore] Persisting ${state.transfers.size} transfers to disk`);
          await window.link.fileTransfer.saveTransfers(record);
        } catch (err) {
          console.error('[FileTransferStore] Save error —', err);
        }
      }
    }, 500); // 500ms debounce
  }
});

window.addEventListener('beforeunload', () => {
  if (saveTimeout && window.link?.fileTransfer?.saveTransfers) {
    clearTimeout(saveTimeout);
    const record: Record<string, LinkFileTransfer> = {};
    const transfers = useFileTransferStore.getState().transfers;
    for (const [id, transfer] of transfers.entries()) {
      record[id] = transfer;
    }
    console.log('[FileTransferStore] beforeunload: flushing transfers to disk');
    // Fire and forget, OS usually allows small async IPC messages in beforeunload
    window.link.fileTransfer.saveTransfers(record);
  }
});
