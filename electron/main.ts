import { app, BrowserWindow, ipcMain } from 'electron';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const preloadPath = fs.existsSync(path.join(__dirname, 'preload.mjs'))
    ? path.join(__dirname, 'preload.mjs')
    : path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 550,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0b0f19',
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Reveal window smoothly when DOM & CSS render completely to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

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

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
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
