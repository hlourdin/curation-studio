import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { decryptToken, encryptToken } from '../api/_lib/token-crypto.js';

test('encrypts Spotify refresh tokens with authenticated encryption', () => {
  process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  const original = 'spotify-refresh-token';
  const encrypted = encryptToken(original);

  assert.notEqual(encrypted.ciphertext, original);
  assert.equal(decryptToken(encrypted.ciphertext, encrypted.iv), original);
});

test('rejects an invalid token encryption key', () => {
  process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY = Buffer.from('short').toString('base64');
  assert.throws(() => encryptToken('token'), /SPOTIFY_TOKEN_ENCRYPTION_KEY_INVALID/);
});
