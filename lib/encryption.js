import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Derives a 32-byte Buffer key from the environment variable TOKEN_ENCRYPTION_KEY.
 * Accepts either a 64-character hex string or 32-character utf-8 string.
 */
function getEncryptionKey() {
  const rawKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not defined in environment variables.');
  }

  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  // Fallback: derive 32-byte key via SHA-256 hash if rawKey is arbitrary string
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypts a plaintext string (e.g. OAuth refresh token) using AES-256-GCM.
 * @param {string} text - Plaintext to encrypt
 * @returns {string} Colon-delimited format: 'iv:authTag:encryptedData'
 */
export function encryptToken(text) {
  if (!text) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted token string using AES-256-GCM.
 * @param {string} encryptedString - Format 'iv:authTag:encryptedData'
 * @returns {string} Decrypted plaintext string
 */
export function decryptToken(encryptedString) {
  if (!encryptedString) return null;
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format.');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
