import { app, safeStorage } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getOrGenerateIdentity } from '../identity/identity.js';

class MessageStore {
  private getDbPath(): string {
    return path.join(app.getPath('userData'), 'messages.enc');
  }

  private getFallbackKey(): Buffer {
    const identity = getOrGenerateIdentity();
    // Derive a 32-byte AES-256 key from the identity secret key
    return crypto.createHash('sha256').update(Buffer.from(identity.secretKey)).digest();
  }

  private encryptData(data: string): Buffer {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(data);
    } else {
      // Fallback: AES-256-GCM
      const key = this.getFallbackKey();
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();
      // Combine IV (12 bytes) + AuthTag (16 bytes) + Encrypted Data
      return Buffer.concat([iv, authTag, encrypted]);
    }
  }

  private decryptData(buffer: Buffer): string {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(buffer);
    } else {
      // Fallback: AES-256-GCM
      const key = this.getFallbackKey();
      const iv = buffer.subarray(0, 12);
      const authTag = buffer.subarray(12, 28);
      const encrypted = buffer.subarray(28);
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    }
  }

  public async saveMessages(data: Record<string, any[]>): Promise<void> {
    try {
      const jsonStr = JSON.stringify(data);
      const encryptedBuffer = this.encryptData(jsonStr);
      await fs.writeFile(this.getDbPath(), encryptedBuffer);
    } catch (err) {
      console.error('[MessageStore] Failed to save messages:', err);
    }
  }

  public async loadMessages(): Promise<Record<string, any[]>> {
    try {
      const dbPath = this.getDbPath();
      await fs.access(dbPath);
      const encryptedBuffer = await fs.readFile(dbPath);
      const jsonStr = this.decryptData(encryptedBuffer);
      return JSON.parse(jsonStr);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error('[MessageStore] Failed to load messages:', err);
      }
      return {}; // Return empty record if file doesn't exist or fails to decrypt
    }
  }
}

export const messageStore = new MessageStore();
