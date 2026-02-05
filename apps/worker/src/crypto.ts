function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export async function decryptAesGcmB64(payloadB64: string, keyB64: string): Promise<string> {
  // payload format: b64(iv(12) || ciphertext+tag)
  const raw = b64ToBytes(payloadB64);
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const keyBytes = b64ToBytes(keyB64);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plainBuf);
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const keyData = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", keyData, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function normalizePrompt(input: unknown): string {
  // Best-effort normalization for loop detection.
  // For OpenAI chat: take messages and stringify role+content.
  try {
    if (typeof input === "string") return input.trim();
    if (input && typeof input === "object") return JSON.stringify(input);
    return String(input ?? "").trim();
  } catch {
    return String(input ?? "").trim();
  }
}

export function approxTokens(text: string): number {
  // Very rough: 1 token ~= 4 chars in English.
  return Math.ceil((text || "").length / 4);
}

export function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function nowMs(): number {
  return Date.now();
}
