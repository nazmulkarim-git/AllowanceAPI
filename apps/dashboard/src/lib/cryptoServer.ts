import crypto from "crypto";

export function encryptAesGcmToB64(plain: string, keyB64: string): string {
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) throw new Error("SERVER_ENCRYPTION_KEY_B64 must be 32 bytes (base64).");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plain, "utf-8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  const out = Buffer.concat([iv, ciphertext, tag]);
  return out.toString("base64");
}
