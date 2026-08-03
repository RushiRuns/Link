import { connectionManager, ActiveConnection } from './connection-manager.js';
import { getOrGenerateIdentity } from '../identity/identity.js';
import { db } from '../storage/db.js';
import { getFingerprint } from '../identity/fingerprint.js';

export interface HandshakeHelloPayload {
  deviceId: string;
  displayName: string;
  appVersion: string;
}

export interface HandshakeAckPayload {
  accepted: boolean;
  reason?: 'version_mismatch' | 'unknown';
}

export interface ProfileUpdatePayload {
  displayName: string;
}

function parseMajorMinor(versionStr: string): string {
  const parts = versionStr.split('.');
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[1]}`;
  }
  return versionStr;
}

export function setupHandshakeHandler() {
  connectionManager.on('message', (tempOrDeviceId: string, envelope: any) => {
    if (envelope.type === 'handshake.hello') {
      handleHandshakeHello(tempOrDeviceId, envelope.payload);
    } else if (envelope.type === 'handshake.ack') {
      handleHandshakeAck(tempOrDeviceId, envelope.payload);
    } else if (envelope.type === 'profile.update') {
      handleProfileUpdate(tempOrDeviceId, envelope.payload);
    }
  });
}

function handleHandshakeHello(senderTempId: string, payload: HandshakeHelloPayload) {
  const localIdentity = getOrGenerateIdentity();
  const conn = connectionManager.getActiveConnection(senderTempId);
  if (!conn) return;

  const localMajorMinor = parseMajorMinor(localIdentity.appVersion);
  const remoteMajorMinor = parseMajorMinor(payload.appVersion || '0.0.0');

  // Version Check (major.minor must match)
  if (localMajorMinor !== remoteMajorMinor) {
    console.warn(
      `[Handshake] Version mismatch with ${payload.displayName}: local=${localIdentity.appVersion}, remote=${payload.appVersion}`
    );
    connectionManager.send(senderTempId, {
      type: 'handshake.ack',
      id: 'ack_' + Date.now(),
      ts: Date.now(),
      payload: { accepted: false, reason: 'version_mismatch' }
    });
    setTimeout(() => connectionManager.disconnect(senderTempId), 500);
    return;
  }

  // TOFU (Trust On First Use) Check
  const pubKeyBase64 = Buffer.from(conn.remotePublicKey).toString('base64');
  const existingRecord = db.getPeer(payload.deviceId);

  if (existingRecord && existingRecord.publicKey !== pubKeyBase64) {
    console.warn(
      `[Handshake] Public key updated for peer ${payload.deviceId} (${payload.displayName}). Updating TOFU record.`
    );
  }

  // Save/update KnownPeers record
  db.upsertPeer({
    id: payload.deviceId,
    displayName: payload.displayName,
    publicKey: pubKeyBase64,
    publicKeyFingerprint: getFingerprint(conn.remotePublicKey),
    appVersion: payload.appVersion,
    lastSeen: new Date().toISOString()
  });

  // Register real device ID in ConnectionManager
  connectionManager.registerDeviceId(senderTempId, payload.deviceId);

  // Send positive Ack
  connectionManager.send(payload.deviceId, {
    type: 'handshake.ack',
    id: 'ack_' + Date.now(),
    ts: Date.now(),
    payload: { accepted: true }
  });
}

function handleHandshakeAck(senderDeviceId: string, payload: HandshakeAckPayload) {
  if (!payload.accepted) {
    console.warn(`[Handshake] Peer ${senderDeviceId} rejected connection: ${payload.reason}`);
    connectionManager.disconnect(senderDeviceId);
  }
}

function handleProfileUpdate(senderDeviceId: string, payload: ProfileUpdatePayload) {
  const existingRecord = db.getPeer(senderDeviceId);
  if (existingRecord) {
    existingRecord.displayName = payload.displayName;
    db.upsertPeer(existingRecord);
    
    // Notify frontend
    const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      const activeConn = connectionManager.getActiveConnection(senderDeviceId);
      mainWindow.webContents.send('peer:connected', {
        ...existingRecord,
        status: 'online',
        networkAddress: activeConn?.socket.remoteAddress,
        listeningPort: activeConn?.socket.remotePort
      });
    }
  }
}

export function sendHandshakeHello(conn: ActiveConnection) {
  const localIdentity = getOrGenerateIdentity();
  connectionManager.send(conn.deviceId, {
    type: 'handshake.hello',
    id: 'hello_' + Date.now(),
    ts: Date.now(),
    payload: {
      deviceId: localIdentity.deviceId,
      displayName: localIdentity.displayName,
      appVersion: localIdentity.appVersion
    }
  });
}

export function broadcastProfileUpdate(displayName: string) {
  const connections = connectionManager.getAllConnections();
  for (const conn of connections) {
    connectionManager.send(conn.deviceId, {
      type: 'profile.update',
      id: 'profile_' + Date.now(),
      ts: Date.now(),
      payload: { displayName }
    });
  }
}
