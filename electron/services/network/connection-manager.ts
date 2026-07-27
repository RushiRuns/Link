import { EventEmitter } from 'events';
import net from 'net';
import { NoiseSession, initiateHandshake, acceptHandshake } from './noise.js';
import { getOrGenerateIdentity } from '../identity/identity.js';
import { encodeWireMessage, decodeWireMessage, WireEnvelope } from './wire.js';

export interface ActiveConnection {
  deviceId: string;
  socket: net.Socket;
  session: NoiseSession;
  remotePublicKey: Uint8Array;
  lastActive: number;
}

class ConnectionManager extends EventEmitter {
  private connections: Map<string, ActiveConnection> = new Map();
  private server: net.Server | null = null;
  private listeningPort: number = 0;

  public async startServer(port: number = 0): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => this.handleIncomingConnection(socket));
      this.server.listen(port, () => {
        const addr = this.server?.address();
        if (addr && typeof addr !== 'string') {
          this.listeningPort = addr.port;
          console.log(`[ConnectionManager] TCP Server listening on port ${this.listeningPort}`);
          resolve(this.listeningPort);
        } else {
          reject(new Error('Failed to obtain server address'));
        }
      });
      this.server.on('error', (err) => reject(err));
    });
  }

  public getPort(): number {
    return this.listeningPort;
  }

  private async handleIncomingConnection(socket: net.Socket) {
    socket.once('data', async (initialData: Buffer) => {
      try {
        const identity = getOrGenerateIdentity();
        const { session, remotePublicKey } = await acceptHandshake(
          socket,
          identity.publicKey,
          identity.secretKey,
          initialData
        );
        this.setupSocketListeners(socket, session, remotePublicKey);
      } catch (err) {
        console.error('[ConnectionManager] Failed incoming handshake:', err);
        socket.destroy();
      }
    });
  }

  public async connectToPeer(
    host: string,
    port: number,
    _expectedPublicKey?: Uint8Array
  ): Promise<ActiveConnection> {
    const identity = getOrGenerateIdentity();
    const socket = new net.Socket();

    return new Promise((resolve, reject) => {
      socket.connect(port, host, async () => {
        try {
          const { session, remotePublicKey } = await initiateHandshake(
            socket,
            identity.publicKey,
            identity.secretKey
          );
          const conn = this.setupSocketListeners(socket, session, remotePublicKey);
          resolve(conn);
        } catch (err) {
          socket.destroy();
          reject(err);
        }
      });

      socket.on('error', (err) => reject(err));
    });
  }

  private setupSocketListeners(
    socket: net.Socket,
    session: NoiseSession,
    remotePublicKey: Uint8Array
  ): ActiveConnection {
    // Temporary deviceId until HandshakeHello occurs
    const tempDeviceId = 'pending_' + Math.random().toString(36).substring(2, 9);
    const conn: ActiveConnection = {
      deviceId: tempDeviceId,
      socket,
      session,
      remotePublicKey,
      lastActive: Date.now()
    };

    this.connections.set(tempDeviceId, conn);

    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk: Buffer) => {
      conn.lastActive = Date.now();
      buffer = Buffer.concat([buffer, chunk]);

      // Read 4-byte length prefix framed Noise frames
      while (buffer.length >= 4) {
        const frameLen = buffer.readUInt32BE(0);
        if (buffer.length < 4 + frameLen) break;

        const cipherFrame = buffer.subarray(4, 4 + frameLen);
        buffer = buffer.subarray(4 + frameLen);

        try {
          const plaintext = session.decrypt(cipherFrame);
          const envelope = decodeWireMessage(plaintext);
          this.emit('message', conn.deviceId, envelope);
        } catch (err) {
          console.error(`[ConnectionManager] Frame decrypt error from ${conn.deviceId}:`, err);
        }
      }
    });

    socket.on('close', () => {
      if (this.connections.has(conn.deviceId)) {
        this.connections.delete(conn.deviceId);
        this.emit('peer:disconnected', conn.deviceId);
      }
    });

    socket.on('error', (err) => {
      console.warn(`[ConnectionManager] Socket error on ${conn.deviceId}:`, err.message);
    });

    return conn;
  }

  public registerDeviceId(tempId: string, realDeviceId: string): ActiveConnection | undefined {
    const conn = this.connections.get(tempId);
    if (conn) {
      this.connections.delete(tempId);
      conn.deviceId = realDeviceId;
      this.connections.set(realDeviceId, conn);
      this.emit('peer:connected', conn);
      return conn;
    }
    return undefined;
  }

  public send(deviceId: string, envelope: WireEnvelope): boolean {
    const conn = this.connections.get(deviceId);
    if (!conn) return false;

    try {
      const plaintext = encodeWireMessage(envelope.type, envelope.payload, envelope.id);
      const ciphertext = conn.session.encrypt(plaintext);

      // Frame with 4-byte length prefix
      const frameHeader = Buffer.alloc(4);
      frameHeader.writeUInt32BE(ciphertext.length, 0);

      conn.socket.write(Buffer.concat([frameHeader, Buffer.from(ciphertext)]));
      return true;
    } catch (err) {
      console.error(`[ConnectionManager] Send error to ${deviceId}:`, err);
      return false;
    }
  }

  public broadcast(deviceIds: string[], envelope: WireEnvelope) {
    deviceIds.forEach((id) => this.send(id, envelope));
  }

  public disconnect(deviceId: string) {
    const conn = this.connections.get(deviceId);
    if (conn) {
      conn.socket.destroy();
      this.connections.delete(deviceId);
      this.emit('peer:disconnected', deviceId);
    }
  }

  public getActiveConnection(deviceId: string): ActiveConnection | undefined {
    return this.connections.get(deviceId);
  }

  public getAllConnections(): ActiveConnection[] {
    return Array.from(this.connections.values());
  }
}

export const connectionManager = new ConnectionManager();
