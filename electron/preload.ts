import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  ping: () => ipcRenderer.invoke('ping'),
  windowControl: (action: 'minimize' | 'maximize' | 'close') => ipcRenderer.send('window-control', action)
});
