import { EventEmitter } from 'events';
import multicastDNS from 'multicast-dns';
import { getOrGenerateIdentity } from '../identity/identity.js';

export interface DiscoveredPeerAnnouncement {
  deviceId: string;
  displayName: string;
  publicKey: string;
  appVersion: string;
  tcpPort: number;
  ipAddress: string;
  source: 'mdns' | 'udp';
}

class MDNSDiscovery extends EventEmitter {
  private mdnsInstance: any = null;
  private announceInterval: NodeJS.Timeout | null = null;
  private currentTcpPort: number = 0;

  public start(tcpPort: number) {
    this.currentTcpPort = tcpPort;
    try {
      this.mdnsInstance = multicastDNS();

      this.mdnsInstance.on('response', (response: any) => {
        this.handleResponse(response);
      });

      this.mdnsInstance.on('query', (query: any) => {
        this.handleQuery(query);
      });

      // Announce immediately and every 5 seconds
      this.announce();
      this.announceInterval = setInterval(() => this.announce(), 5000);
    } catch (err) {
      console.warn('[mDNS] Failed to start mDNS listener (multicast may be restricted):', err);
    }
  }

  public stop() {
    if (this.announceInterval) {
      clearInterval(this.announceInterval);
      this.announceInterval = null;
    }
    if (this.mdnsInstance) {
      try {
        this.mdnsInstance.destroy();
      } catch (err) {
        // ignore
      }
      this.mdnsInstance = null;
    }
  }

  public announce() {
    if (!this.mdnsInstance || !this.currentTcpPort) return;
    const identity = getOrGenerateIdentity();

    try {
      this.mdnsInstance.respond({
        answers: [
          {
            name: '_link._tcp.local',
            type: 'PTR',
            data: `${identity.deviceId}._link._tcp.local`
          },
          {
            name: `${identity.deviceId}._link._tcp.local`,
            type: 'SRV',
            data: { port: this.currentTcpPort, target: `${identity.deviceId}.local` }
          },
          {
            name: `${identity.deviceId}._link._tcp.local`,
            type: 'TXT',
            data: [
              `id=${identity.deviceId}`,
              `name=${identity.displayName}`,
              `pub=${identity.publicKeyBase64}`,
              `ver=${identity.appVersion}`
            ]
          }
        ]
      });
    } catch (err) {
      console.warn('[mDNS] Error broadcasting announce:', err);
    }
  }

  private handleQuery(query: any) {
    const isLinkQuery = query.questions?.some((q: any) => q.name.includes('_link._tcp'));
    if (isLinkQuery) {
      this.announce();
    }
  }

  private handleResponse(response: any) {
    const txtRecord = response.answers?.find((a: any) => a.type === 'TXT' && a.name.includes('_link._tcp'));
    const srvRecord = response.answers?.find((a: any) => a.type === 'SRV' && a.name.includes('_link._tcp'));
    const aRecord = response.answers?.find((a: any) => a.type === 'A') || response.additionals?.find((a: any) => a.type === 'A');

    if (!txtRecord || !srvRecord) return;

    try {
      const txtData: Record<string, string> = {};
      const rawTxt = Array.isArray(txtRecord.data) ? txtRecord.data : [txtRecord.data];

      rawTxt.forEach((item: any) => {
        const str = item.toString('utf-8');
        const [k, v] = str.split('=');
        if (k && v) txtData[k] = v;
      });

      const localIdentity = getOrGenerateIdentity();
      if (txtData.id && txtData.id !== localIdentity.deviceId) {
        const announcement: DiscoveredPeerAnnouncement = {
          deviceId: txtData.id,
          displayName: txtData.name || 'Peer',
          publicKey: txtData.pub || '',
          appVersion: txtData.ver || '1.0.0',
          tcpPort: srvRecord.data?.port || 0,
          ipAddress: aRecord?.data || '127.0.0.1',
          source: 'mdns'
        };
        this.emit('peer-found', announcement);
      }
    } catch (err) {
      console.error('[mDNS] Error parsing response:', err);
    }
  }
}

export const mdnsDiscovery = new MDNSDiscovery();
