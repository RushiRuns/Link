import { EventEmitter } from 'events';
import { mdnsDiscovery, DiscoveredPeerAnnouncement } from './mdns.js';
import { udpBroadcastDiscovery } from './udp-broadcast.js';
import { connectionManager } from '../network/connection-manager.js';
import { sendHandshakeHello } from '../network/handshake.js';
import { getFingerprint } from '../identity/fingerprint.js';
import { db } from '../storage/db.js';

class DiscoveryManager extends EventEmitter {
  private discoveredPeers: Map<string, DiscoveredPeerAnnouncement> = new Map();
  private noPeersTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  public start(tcpPort: number) {
    if (this.isRunning) return;
    this.isRunning = true;

    // Listen to mDNS and UDP broadcast announcements
    mdnsDiscovery.on('peer-found', (peer) => this.handleDiscoveredPeer(peer));
    udpBroadcastDiscovery.on('peer-found', (peer) => this.handleDiscoveredPeer(peer));

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
    mdnsDiscovery.stop();
    udpBroadcastDiscovery.stop();
  }

  private async handleDiscoveredPeer(peer: DiscoveredPeerAnnouncement) {
    if (!peer.deviceId || !peer.tcpPort) return;

    // Deduplicate
    const existing = this.discoveredPeers.get(peer.deviceId);
    if (existing && existing.ipAddress === peer.ipAddress && existing.tcpPort === peer.tcpPort) {
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
