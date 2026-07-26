import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface KnownPeerRecord {
  id: string;
  displayName: string;
  publicKey: string;
  publicKeyFingerprint: string;
  appVersion: string;
  lastSeen: string;
}

class StorageDB {
  private dbPath: string = '';
  private memoryCache: Map<string, KnownPeerRecord> = new Map();

  public init() {
    try {
      const userDataDir = app.getPath('userData');
      const dbDir = path.join(userDataDir, 'storage');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      this.dbPath = path.join(dbDir, 'peers.json');
      this.load();
    } catch (err) {
      console.warn('[StorageDB] Initializing in fallback memory mode:', err);
    }
  }

  private load() {
    if (this.dbPath && fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        const list: KnownPeerRecord[] = JSON.parse(raw);
        list.forEach((p) => this.memoryCache.set(p.id, p));
      } catch (err) {
        console.error('[StorageDB] Error reading peers file, creating fresh store:', err);
      }
    }
  }

  private persist() {
    if (!this.dbPath) return;
    try {
      const list = Array.from(this.memoryCache.values());
      fs.writeFileSync(this.dbPath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[StorageDB] Error persisting peers:', err);
    }
  }

  public upsertPeer(peer: KnownPeerRecord): KnownPeerRecord {
    this.memoryCache.set(peer.id, peer);
    this.persist();
    return peer;
  }

  public getPeer(id: string): KnownPeerRecord | undefined {
    return this.memoryCache.get(id);
  }

  public getAllPeers(): KnownPeerRecord[] {
    return Array.from(this.memoryCache.values());
  }

  public removePeer(id: string): boolean {
    const deleted = this.memoryCache.delete(id);
    if (deleted) this.persist();
    return deleted;
  }
}

export const db = new StorageDB();
