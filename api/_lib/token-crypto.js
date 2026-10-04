import crypto from 'node:crypto';

function encryptionKey() {
  const encoded = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error('SPOTIFY_TOKEN_ENCRYPTION_KEY_MISSING');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new Error('SPOTIFY_TOKEN_ENCRYPTION_KEY_INVALID');
  return key;
}

export function encryptToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: Buffer.concat([ciphertext, tag]).toString('base64'),
    iv: iv.toString('base64')
  };
}

export function decryptToken(ciphertext, iv) {
  const payload = Buffer.from(ciphertext, 'base64');
  const authTag = payload.subarray(payload.length - 16);
  const encrypted = payload.subarray(0, payload.length - 16);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
