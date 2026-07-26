import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './services/storage/db.js';
import { registerIpcHandlers } from './services/ipc/handlers.js';
import { setupHandshakeHandler } from './services/network/handshake.js';
import { startKeepaliveMonitor } from './services/network/keepalive.js';
import { connectionManager } from './services/network/connection-manager.js';
import { discoveryManager } from './services/discovery/discovery-manager.js';
import { messageService } from './services/messaging/message-service.js';
import { groupService } from './services/groups/group-service.js';
import { fileTransferService } from './services/file-transfer/file-transfer-service.js';
import { callSignalingService } from './services/calls/call-signaling.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const preloadPath = fs.existsSync(path.join(__dirname, 'preload.mjs'))
    ? path.join(__dirname, 'preload.mjs')
    : path.join(__dirname, 'preload.js');

  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 550,
    frame: !isMac,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#14161b' : '#f6f8fa',
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Reveal window smoothly when DOM & CSS render completely
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // T057: Listen for OS theme changes and notify renderer
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors);
    }
  });

  messageService.init(mainWindow);
  groupService.init(mainWindow);
  fileTransferService.init(mainWindow);
  callSignalingService.init(mainWindow);

  const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Initialize storage & IPC handlers
    db.init();
    registerIpcHandlers();
    setupHandshakeHandler();
    startKeepaliveMonitor();

    // Start TCP listener on dynamic port
    let tcpPort = 0;
    try {
      tcpPort = await connectionManager.startServer();
    } catch (err) {
      console.warn('[Main] ConnectionManager server failed to start:', err);
    }

    createWindow();

    // Forward network & discovery events to renderer
    discoveryManager.on('peer:online', (peer) => {
      mainWindow?.webContents.send('peer:connected', peer);
    });

    discoveryManager.on('discovery:no-peers-found', () => {
      mainWindow?.webContents.send('discovery:no-peers-found');
    });

    connectionManager.on('peer:disconnected', (peerId) => {
      mainWindow?.webContents.send('peer:disconnected', peerId);
    });

    // Start layered discovery (mDNS + UDP fallback)
    if (tcpPort) {
      discoveryManager.start(tcpPort);
    }

    // Listen for OS theme changes
    nativeTheme.on('updated', () => {
      mainWindow?.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors);
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  discoveryManager.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// System Info IPC Handler
ipcMain.handle('get-system-info', async () => {
  const cpus = os.cpus();
  return {
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    cpuModel: cpus.length > 0 ? cpus[0].model : 'Unknown CPU',
    cpuCores: cpus.length,
    totalMemGB: (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2),
    freeMemGB: (os.freemem() / (1024 * 1024 * 1024)).toFixed(2),
    versions: {
      electron: process.versions.electron,
      node: process.versions.node,
      chrome: process.versions.chrome
    }
  };
});

// Ping Benchmark IPC Handler
ipcMain.handle('ping', async () => {
  return {
    message: 'pong',
    timestamp: Date.now()
  };
});

// Window Controls IPC Listener
ipcMain.on('window-control', (_, action: 'minimize' | 'maximize' | 'close' | 'is-maximized') => {
  if (!mainWindow) return;
  switch (action) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'maximize':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      break;
    case 'close':
      mainWindow.close();
      break;
  }
});
