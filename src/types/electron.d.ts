export interface SystemInfo {
  platform: string;
  arch: string;
  hostname: string;
  cpuModel: string;
  cpuCores: number;
  totalMemGB: string;
  freeMemGB: string;
  versions: {
    electron: string;
    node: string;
    chrome: string;
  };
}

export interface ElectronAPI {
  getSystemInfo: () => Promise<SystemInfo>;
  ping: () => Promise<{ message: string; timestamp: number }>;
  windowControl: (action: 'minimize' | 'maximize' | 'close') => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
