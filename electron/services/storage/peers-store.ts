import { db, KnownPeerRecord } from './db.js';

export const peersStore = {
  getKnownPeers: (): KnownPeerRecord[] => {
    return db.getAllPeers();
  },

  getPeerById: (id: string): KnownPeerRecord | undefined => {
    return db.getPeer(id);
  },

  upsertPeer: (peer: KnownPeerRecord): KnownPeerRecord => {
    return db.upsertPeer(peer);
  },

  updateLastSeen: (id: string): boolean => {
    const existing = db.getPeer(id);
    if (existing) {
      existing.lastSeen = new Date().toISOString();
      db.upsertPeer(existing);
      return true;
    }
    return false;
  },

  removePeer: (id: string): boolean => {
    return db.removePeer(id);
  }
};
