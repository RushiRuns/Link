import crypto from 'crypto';

/**
 * Derives a human-readable SHA-256 fingerprint (formatted in pairs of uppercase hex characters)
 * from a raw base64 or Uint8Array public key.
 */
export function getFingerprint(publicKey: string | Uint8Array): string {
  const bytes = typeof publicKey === 'string' ? Buffer.from(publicKey, 'base64') : Buffer.from(publicKey);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
  // Format into 4-character blocks, e.g. "A1B2 C3D4 E5F6 7890" (first 16 hex chars)
  const truncated = hash.substring(0, 16);
  return truncated.match(/.{1,4}/g)?.join(' ') || truncated;
}
