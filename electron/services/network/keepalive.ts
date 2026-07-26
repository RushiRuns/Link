import { connectionManager } from './connection-manager.js';

let keepaliveTimer: NodeJS.Timeout | null = null;

export function startKeepaliveMonitor() {
  if (keepaliveTimer) return;

  keepaliveTimer = setInterval(() => {
    const now = Date.now();
    const connections = connectionManager.getAllConnections();

    for (const conn of connections) {
      // Send keepalive every 15s if connection has been idle for >10s
      if (now - conn.lastActive >= 10000) {
        connectionManager.send(conn.deviceId, {
          type: 'keepalive',
          id: 'ping_' + now,
          ts: now,
          payload: {}
        });
      }

      // If no message or response received for >30s, treat peer as offline/timed out
      if (now - conn.lastActive > 30000) {
        console.warn(`[Keepalive] Peer ${conn.deviceId} timed out (no activity for 30s).`);
        connectionManager.disconnect(conn.deviceId);
      }
    }
  }, 15000);
}

export function stopKeepaliveMonitor() {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }
}
