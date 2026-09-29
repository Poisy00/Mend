import { requiredSecret } from "./runtime";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function decode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("Invalid AI encryption key or ciphertext");
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "="));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function encode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

async function key() {
  const raw = decode(requiredSecret("AI_CREDENTIALS_ENCRYPTION_KEY"));
  if (raw.length !== 32) throw new Error("AI_CREDENTIALS_ENCRYPTION_KEY must contain 32 bytes in base64url form");
  return crypto.subtle.importKey("raw", raw as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function associatedData(ownerUserId: string, purpose: string) {
  return encoder.encode(`mend-ai:v1:${ownerUserId}:${purpose}`);
}

export async function encryptAI(value: string, ownerUserId: string, purpose: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: associatedData(ownerUserId, purpose) as BufferSource },
    await key(), encoder.encode(value),
  );
  return `v1.${encode(iv)}.${encode(new Uint8Array(ciphertext))}`;
}

export async function decryptAI(value: string, ownerUserId: string, purpose: string) {
  try {
    const [version, nonce, ciphertext, extra] = value.split(".");
    if (version !== "v1" || !nonce || !ciphertext || extra) throw new Error("Invalid ciphertext");
    const iv = decode(nonce);
    if (iv.length !== 12) throw new Error("Invalid nonce");
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource, additionalData: associatedData(ownerUserId, purpose) as BufferSource },
      await key(), decode(ciphertext) as BufferSource,
    );
    return decoder.decode(plaintext);
  } catch {
    throw new Error("AI encrypted data could not be opened");
  }
}
