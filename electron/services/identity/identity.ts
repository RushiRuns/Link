import { generateKeyPair } from '@stablelib/x25519';
import { v4 as uuidv4 } from 'uuid';
import { configStore } from '../storage/config.js';
import { getFingerprint } from './fingerprint.js';
import os from 'os';

export interface LocalKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface LocalIdentityFull {
  deviceId: string;
  displayName: string;
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  publicKeyBase64: string;
  publicKeyFingerprint: string;
  appVersion: string;
}

let cachedIdentity: LocalIdentityFull | null = null;

export function getOrGenerateIdentity(): LocalIdentityFull {
  if (cachedIdentity) return cachedIdentity;

  let deviceId = configStore.get('deviceId');
  let displayName = configStore.get('displayName');
  let pubKeyBase64 = configStore.get('publicKey');
  let secretKeyBase64 = configStore.getDecrypted('encryptedPrivateKey');

  let pubKey: Uint8Array;
  let secKey: Uint8Array;

  if (!deviceId || !pubKeyBase64 || !secretKeyBase64) {
    deviceId = uuidv4();
    displayName = displayName || os.userInfo().username || 'User';

    const pair = generateKeyPair();
    pubKey = pair.publicKey;
    secKey = pair.secretKey;

    pubKeyBase64 = Buffer.from(pubKey).toString('base64');
    secretKeyBase64 = Buffer.from(secKey).toString('base64');

    configStore.set('deviceId', deviceId);
    configStore.set('displayName', displayName);
    configStore.set('publicKey', pubKeyBase64);
    configStore.setEncrypted('encryptedPrivateKey', secretKeyBase64);
  } else {
    pubKey = new Uint8Array(Buffer.from(pubKeyBase64, 'base64'));
    secKey = new Uint8Array(Buffer.from(secretKeyBase64, 'base64'));
  }

  const fingerprint = getFingerprint(pubKey);

  cachedIdentity = {
    deviceId,
    displayName,
    publicKey: pubKey,
    secretKey: secKey,
    publicKeyBase64: pubKeyBase64,
    publicKeyFingerprint: fingerprint,
    appVersion: '1.0.0'
  };

  return cachedIdentity;
}

export function setDisplayName(name: string): LocalIdentityFull {
  const identity = getOrGenerateIdentity();
  identity.displayName = name;
  configStore.set('displayName', name);
  return identity;
}
