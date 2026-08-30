import { EventEmitter } from 'events';
import { mdnsDiscovery, DiscoveredPeerAnnouncement } from './mdns.js';
import { udpBroadcastDiscovery } from './udp-broadcast.js';
import { connectionManager } from '../network/connection-manager.js';
import { sendHandshakeHello } from '../network/handshake.js';
import { getFingerprint } from '../identity/fingerprint.js';
import { getOrGenerateIdentity } from '../identity/identity.js';
import { db } from '../storage/db.js';

class DiscoveryManager extends EventEmitter {
  private discoveredPeers: Map<string, DiscoveredPeerAnnouncement> = new Map();
  private noPeersTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  private parseMajorMinor(versionStr: string): string {
    const parts = (versionStr || '0.0.0').split('.');
    return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : versionStr;
  }

  private isVersionCompatible(remoteVersion: string): boolean {
    const { appVersion } = getOrGenerateIdentity();
    return this.parseMajorMinor(appVersion) === this.parseMajorMinor(remoteVersion);
  }

  constructor() {
    super();
    // Listen to mDNS and UDP broadcast announcements
    mdnsDiscovery.on('peer-found', (peer) => this.handleDiscoveredPeer(peer));
    udpBroadcastDiscovery.on('peer-found', (peer) => this.handleDiscoveredPeer(peer));

    // If a connection drops (e.g. ECONNRESET after sleep), remove it from the deduplication 
    // cache so the next incoming broadcast will trigger a fresh reconnection.
    connectionManager.on('peer:disconnected', (deviceId) => {
      const cached = this.discoveredPeers.get(deviceId);
      if (cached && this.isVersionCompatible(cached.appVersion)) {
        // Compatible peer disconnected (e.g. after sleep/wake) — clear cache to allow reconnection.
        console.log(`[DiscoveryManager] Compatible peer ${cached.deviceId} disconnected — clearing cache for reconnection.`);
        this.discoveredPeers.delete(deviceId);
      } else if (cached) {
        // Incompatible peer was rejected — keep in cache to suppress infinite reconnect loop.
        console.log(`[DiscoveryManager] Incompatible peer ${deviceId} (v${cached.appVersion}) disconnected — keeping in cache to suppress flicker.`);
      } else {
        // Peer disconnected before discovery cache was populated (e.g. inbound connection).
        console.log(`[DiscoveryManager] Peer ${deviceId} disconnected but was not in discovery cache.`);
      }
    });
  }

  public start(tcpPort: number) {
    if (this.isRunning) return;
    this.isRunning = true;

    // Start mDNS immediately
    mdnsDiscovery.start(tcpPort);

    // Fall back to UDP broadcast after 3s timeout
    setTimeout(() => {
      if (this.isRunning) {
        udpBroadcastDiscovery.start(tcpPort);
      }
    }, 3000);

    // If no peers discovered after 10s, emit no-peers-found event
    this.noPeersTimer = setTimeout(() => {
      if (this.discoveredPeers.size === 0) {
        this.emit('discovery:no-peers-found');
      }
    }, 10000);
  }

  public stop() {
    this.isRunning = false;
    if (this.noPeersTimer) {
      clearTimeout(this.noPeersTimer);
      this.noPeersTimer = null;
    }
    this.discoveredPeers.clear();
    mdnsDiscovery.stop();
    udpBroadcastDiscovery.stop();
  }

  public announce() {
    if (this.isRunning) {
      mdnsDiscovery.announce();
      udpBroadcastDiscovery.broadcast();
    }
  }

  private async handleDiscoveredPeer(peer: DiscoveredPeerAnnouncement) {
    if (!peer.deviceId || !peer.tcpPort) {
      console.warn(`[DiscoveryManager] Ignored malformed broadcast (missing deviceId or tcpPort).`);
      return;
    }
    if (!peer.ipAddress) {
      console.warn(`[DiscoveryManager] Ignored broadcast from ${peer.deviceId} (missing ipAddress).`);
      return;
    }

    // Deduplicate
    const existing = this.discoveredPeers.get(peer.deviceId);
    if (existing && existing.ipAddress === peer.ipAddress && existing.tcpPort === peer.tcpPort) {
      // [DEBUG] Uncomment the line below to trace suppressed duplicate broadcasts:
      // console.log(`[DiscoveryManager] Suppressed duplicate broadcast from ${peer.displayName} (${peer.deviceId}) — already cached.`);
      return;
    }

    // Version compatibility check — log clearly if peer is incompatible
    if (!this.isVersionCompatible(peer.appVersion)) {
      const { appVersion: localVersion } = getOrGenerateIdentity();
      console.warn(
        `[DiscoveryManager] Skipping connection to ${peer.displayName} — version mismatch: ` +
        `local=${localVersion}, remote=${peer.appVersion || 'unknown'}. ` +
        `Peer will be cached to suppress future reconnect attempts.`
      );
      // Cache the peer as-is so deduplication silences future broadcasts
      this.discoveredPeers.set(peer.deviceId, peer);
      return;
    }

    this.discoveredPeers.set(peer.deviceId, peer);
    if (this.noPeersTimer) {
      clearTimeout(this.noPeersTimer);
      this.noPeersTimer = null;
    }

    // Check if we already have an active TCP connection to this peer
    const activeConn = connectionManager.getActiveConnection(peer.deviceId);
    if (!activeConn) {
      try {
        console.log(`[DiscoveryManager] Initiating connection to ${peer.displayName} @ ${peer.ipAddress}:${peer.tcpPort}`);
        const expectedPubKey = peer.publicKey ? Buffer.from(peer.publicKey, 'base64') : undefined;
        const conn = await connectionManager.connectToPeer(peer.ipAddress, peer.tcpPort, expectedPubKey);
        
        // Register the device ID IMMEDIATELY so the connection isn't stuck in pending_...
        connectionManager.registerDeviceId(conn.deviceId, peer.deviceId);

        // Initiate post-Noise HandshakeHello
        sendHandshakeHello(conn);

        // Update known peers registry
        db.upsertPeer({
          id: peer.deviceId,
          displayName: peer.displayName,
          publicKey: peer.publicKey,
          publicKeyFingerprint: getFingerprint(peer.publicKey),
          appVersion: peer.appVersion,
          lastSeen: new Date().toISOString()
        });

        this.emit('peer:online', {
          id: peer.deviceId,
          displayName: peer.displayName,
          publicKey: peer.publicKey,
          publicKeyFingerprint: getFingerprint(peer.publicKey),
          appVersion: peer.appVersion,
          status: 'online',
          networkAddress: peer.ipAddress,
          listeningPort: peer.tcpPort
        });
      } catch (err) {
        console.warn(`[DiscoveryManager] Failed to connect to discovered peer ${peer.displayName}:`, err);
      }
    }
  }
}

export const discoveryManager = new DiscoveryManager();
