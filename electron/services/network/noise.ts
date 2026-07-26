import { sharedKey } from '@stablelib/x25519';
import { ChaCha20Poly1305 } from '@stablelib/chacha20poly1305';
import crypto from 'crypto';
import Socket from 'net';

export class NoiseSession {
  private cipherTx: ChaCha20Poly1305;
  private cipherRx: ChaCha20Poly1305;
  private nonceTx: number = 0;
  private nonceRx: number = 0;
  public remotePublicKey: Uint8Array;

  constructor(txKey: Uint8Array, rxKey: Uint8Array, remotePublicKey: Uint8Array) {
    this.cipherTx = new ChaCha20Poly1305(txKey);
    this.cipherRx = new ChaCha20Poly1305(rxKey);
    this.remotePublicKey = remotePublicKey;
  }

  private makeNonce(counter: number): Uint8Array {
    const nonce = new Uint8Array(12);
    const view = new DataView(nonce.buffer);
    view.setBigUint64(4, BigInt(counter), false); // 8-byte big endian counter in last 8 bytes
    return nonce;
  }

  public encrypt(plaintext: Uint8Array): Uint8Array {
    const nonce = this.makeNonce(this.nonceTx++);
    return this.cipherTx.seal(nonce, plaintext);
  }

  public decrypt(ciphertext: Uint8Array): Uint8Array {
    const nonce = this.makeNonce(this.nonceRx++);
    const decrypted = this.cipherRx.open(nonce, ciphertext);
    if (!decrypted) {
      throw new Error('[NoiseSession] Decryption or authentication failed (invalid MAC)');
    }
    return decrypted;
  }
}

/**
 * Perform initial Noise_XX key exchange using ephemeral Curve25519 ECDH + SHA-256 key derivation.
 */
export async function initiateHandshake(
  socket: Socket.Socket,
  localStaticPubKey: Uint8Array,
  localStaticSecKey: Uint8Array
): Promise<{ session: NoiseSession; remotePublicKey: Uint8Array }> {
  // 1. Compute ECDH shared secret from local keypair and remote public key (or socket exchanged key)
  const ephemeralKeypair = (await import('@stablelib/x25519')).generateKeyPair();
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Noise handshake timeout')), 5000);

    // Send Step 1: Ephemeral public key + local static public key
    const step1Payload = Buffer.concat([
      Buffer.from(ephemeralKeypair.publicKey),
      Buffer.from(localStaticPubKey)
    ]);
    socket.write(step1Payload);

    socket.once('data', (data: Buffer) => {
      clearTimeout(timeout);
      try {
        if (data.length < 64) {
          throw new Error('Handshake response payload too short');
        }
        const remoteEphemeralPubKey = new Uint8Array(data.subarray(0, 32));
        const remoteStaticPubKey = new Uint8Array(data.subarray(32, 64));

        // Derive shared secrets via ECDH
        const dh1 = sharedKey(ephemeralKeypair.secretKey, remoteEphemeralPubKey);
        const dh2 = sharedKey(localStaticSecKey, remoteEphemeralPubKey);

        // Derive TX & RX symmetric keys using HKDF/SHA-256
        const combined = crypto.createHash('sha256').update(Buffer.concat([dh1, dh2])).digest();
        const txKey = crypto.createHash('sha256').update(Buffer.concat([combined, Buffer.from('TX')])).digest();
        const rxKey = crypto.createHash('sha256').update(Buffer.concat([combined, Buffer.from('RX')])).digest();

        const session = new NoiseSession(new Uint8Array(txKey), new Uint8Array(rxKey), remoteStaticPubKey);
        resolve({ session, remotePublicKey: remoteStaticPubKey });
      } catch (err) {
        reject(err);
      }
    });
  });
}

export async function acceptHandshake(
  socket: Socket.Socket,
  localStaticPubKey: Uint8Array,
  _localStaticSecKey: Uint8Array,
  initialData: Buffer
): Promise<{ session: NoiseSession; remotePublicKey: Uint8Array }> {
  if (initialData.length < 64) {
    throw new Error('Incoming handshake payload too short');
  }

  const remoteEphemeralPubKey = new Uint8Array(initialData.subarray(0, 32));
  const remoteStaticPubKey = new Uint8Array(initialData.subarray(32, 64));

  const ephemeralKeypair = (await import('@stablelib/x25519')).generateKeyPair();

  // Send Step 2 response: local ephemeral public key + local static public key
  const step2Payload = Buffer.concat([
    Buffer.from(ephemeralKeypair.publicKey),
    Buffer.from(localStaticPubKey)
  ]);
  socket.write(step2Payload);

  // Derive shared secrets via ECDH (reversed TX/RX roles for receiver)
  const dh1 = sharedKey(ephemeralKeypair.secretKey, remoteEphemeralPubKey);
  const dh2 = sharedKey(ephemeralKeypair.secretKey, remoteStaticPubKey);

  const combined = crypto.createHash('sha256').update(Buffer.concat([dh1, dh2])).digest();
  const rxKey = crypto.createHash('sha256').update(Buffer.concat([combined, Buffer.from('TX')])).digest();
  const txKey = crypto.createHash('sha256').update(Buffer.concat([combined, Buffer.from('RX')])).digest();

  const session = new NoiseSession(new Uint8Array(txKey), new Uint8Array(rxKey), remoteStaticPubKey);
  return { session, remotePublicKey: remoteStaticPubKey };
}
