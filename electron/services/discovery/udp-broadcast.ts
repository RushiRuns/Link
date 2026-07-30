import dgram from 'dgram';
import { EventEmitter } from 'events';
import { getOrGenerateIdentity } from '../identity/identity.js';
import { DiscoveredPeerAnnouncement } from './mdns.js';

const UDP_PORT = 47431;

class UDPBroadcastDiscovery extends EventEmitter {
  private socket: dgram.Socket | null = null;
  private broadcastInterval: NodeJS.Timeout | null = null;
  private currentTcpPort: number = 0;

  public start(tcpPort: number) {
    this.currentTcpPort = tcpPort;
    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.socket.on('message', (msg, rinfo) => {
        this.handleMessage(msg, rinfo.address);
      });

      this.socket.on('error', (err) => {
        console.warn('[UDPBroadcast] Socket error:', err.message);
      });

      this.socket.bind(UDP_PORT, () => {
        try {
          this.socket?.setBroadcast(true);
          console.log(`[UDPBroadcast] Listening on UDP port ${UDP_PORT}`);
        } catch (err) {
          console.warn('[UDPBroadcast] Failed to setBroadcast:', err);
        }
      });

      // Broadcast immediately and every 5 seconds
      this.broadcast();
      this.broadcastInterval = setInterval(() => this.broadcast(), 5000);
    } catch (err) {
      console.warn('[UDPBroadcast] Failed to start UDP socket:', err);
    }
  }

  public stop() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch (err) {
        // ignore
      }
      this.socket = null;
    }
  }

  public broadcast() {
    if (!this.socket || !this.currentTcpPort) return;
    const identity = getOrGenerateIdentity();

    const payload = JSON.stringify({
      type: 'discovery.announce',
      deviceId: identity.deviceId,
      displayName: identity.displayName,
      publicKey: identity.publicKeyBase64,
      appVersion: identity.appVersion,
      tcpPort: this.currentTcpPort
    });

    const message = Buffer.from(payload);

    try {
      this.socket.send(message, 0, message.length, UDP_PORT, '255.255.255.255', (err) => {
        if (err) {
          console.warn('[UDPBroadcast] Send error:', err.message);
        }
      });
    } catch (err) {
      console.warn('[UDPBroadcast] Send exception:', err);
    }
  }

  private handleMessage(msg: Buffer, senderIp: string) {
    try {
      const data = JSON.parse(msg.toString('utf-8'));
      if (data.type === 'discovery.announce') {
        const localIdentity = getOrGenerateIdentity();
        if (data.deviceId && data.deviceId !== localIdentity.deviceId) {
          const announcement: DiscoveredPeerAnnouncement = {
            deviceId: data.deviceId,
            displayName: data.displayName || 'Peer',
            publicKey: data.publicKey || '',
            appVersion: data.appVersion || '2.0.0',
            tcpPort: data.tcpPort || 0,
            ipAddress: senderIp,
            source: 'udp'
          };
          this.emit('peer-found', announcement);
        }
      }
    } catch (err) {
      // Ignore non-JSON or invalid UDP packets
    }
  }
}

export const udpBroadcastDiscovery = new UDPBroadcastDiscovery();
