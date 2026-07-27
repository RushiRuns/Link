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
      // Note: We no longer strictly disconnect on 30s of silence because Version 1.0 clients do not send keepalives.
      // We rely on TCP keepalives and socket 'close'/'error' events to detect dead connections.
    }
  }, 15000);
}

export function stopKeepaliveMonitor() {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }
}
