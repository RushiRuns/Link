import Store from 'electron-store';
import { safeStorage } from 'electron';

export interface AppConfigSchema {
  displayName: string;
  deviceId: string;
  encryptedPrivateKey: string;
  publicKey: string;
}

const store = new Store<AppConfigSchema>({
  name: 'link-config',
  defaults: {
    displayName: '',
    deviceId: '',
    encryptedPrivateKey: '',
    publicKey: ''
  }
});

export const configStore = {
  get: <K extends keyof AppConfigSchema>(key: K): AppConfigSchema[K] => store.get(key),
  set: <K extends keyof AppConfigSchema>(key: K, value: AppConfigSchema[K]): void => store.set(key, value),

  // Encrypt secret strings with safeStorage (OS Keychain / DPAPI)
  setEncrypted: (key: 'encryptedPrivateKey', secret: string): void => {
    if (safeStorage.isEncryptionAvailable()) {
      const encryptedBuffer = safeStorage.encryptString(secret);
      store.set(key, encryptedBuffer.toString('base64'));
    } else {
      // Fallback for systems without keychain API available
      store.set(key, Buffer.from(secret).toString('base64'));
    }
  },

  getDecrypted: (key: 'encryptedPrivateKey'): string => {
    const raw = store.get(key);
    if (!raw) return '';
    try {
      const buffer = Buffer.from(raw, 'base64');
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(buffer);
      } else {
        return buffer.toString('utf-8');
      }
    } catch (err) {
      console.error('[ConfigStore] Failed to decrypt key:', err);
      store.set(key, '');
      return '';
    }
  }
};
