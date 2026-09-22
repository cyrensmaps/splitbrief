import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// Encrypts/decrypts users' AI provider API keys before they're stored in the
// database, using AES-256-GCM with a key derived from API_KEY_ENCRYPTION_SECRET.
// Server-only: never import this from a Client Component.

function getKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("API_KEY_ENCRYPTION_SECRET is not set");
  }
  return scryptSync(secret, "splitbrief-api-key-salt", 32);
}

export function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((buf) => buf.toString("base64")).join(".");
}

export function decryptApiKey(ciphertext: string): string {
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
