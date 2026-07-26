import { create } from 'zustand';
import { LinkPeer } from '../types/ipc';

interface PeersState {
  peers: Map<string, LinkPeer>;
  knownPeers: LinkPeer[];
  setPeers: (peers: LinkPeer[]) => void;
  upsertPeer: (peer: LinkPeer) => void;
  removePeer: (peerId: string) => void;
  setPeerStatus: (peerId: string, status: LinkPeer['status']) => void;
  loadKnownPeers: () => Promise<void>;
  initListeners: () => () => void;
}

export const usePeersStore = create<PeersState>((set, get) => ({
  peers: new Map(),
  knownPeers: [],

  setPeers: (peerList) => {
    const map = new Map<string, LinkPeer>();
    peerList.forEach((p) => map.set(p.id, p));
    set({ peers: map });
  },

  upsertPeer: (peer) => {
    set((state) => {
      const nextMap = new Map(state.peers);
      nextMap.set(peer.id, peer);
      return { peers: nextMap };
    });
  },

  removePeer: (peerId) => {
    set((state) => {
      const nextMap = new Map(state.peers);
      nextMap.delete(peerId);
      return { peers: nextMap };
    });
  },

  setPeerStatus: (peerId, status) => {
    set((state) => {
      const existing = state.peers.get(peerId);
      if (existing) {
        const updated = { ...existing, status };
        const nextMap = new Map(state.peers);
        nextMap.set(peerId, updated);
        return { peers: nextMap };
      }
      return state;
    });
  },

  loadKnownPeers: async () => {
    if (window.link?.peers) {
      try {
        const known = await window.link.peers.getKnownPeers();
        set({ knownPeers: known });
      } catch (err) {
        console.error('[PeersStore] Error loading known peers:', err);
      }
    }
  },

  initListeners: () => {
    if (!window.link?.peers) return () => {};

    const cleanConnect = window.link.peers.onPeerConnected((peer) => {
      get().upsertPeer(peer);
    });

    const cleanDisconnect = window.link.peers.onPeerDisconnected((peerId) => {
      get().setPeerStatus(peerId, 'offline');
    });

    return () => {
      cleanConnect();
      cleanDisconnect();
    };
  }
}));
