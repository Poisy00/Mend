import { requiredSecret } from "./runtime";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
// Cloudflare Workers Web Crypto currently caps PBKDF2 at 100,000 iterations.
// Passwords are additionally protected with a high-entropy server-side pepper.
const PBKDF2_ITERATIONS = 100_000;
const HASH_BYTES = 32;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePassword(
  password: string,
  salt: Uint8Array,
  iterations: number,
) {
  const pepper = requiredSecret("AUTH_PEPPER");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`${password}\u0000${pepper}`),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

async function hashPasswordValue(password: string, minimumLength: number) {
  if (password.length < minimumLength) {
    throw new Error(`Password must be at least ${minimumLength} characters`);
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(hash)}`;
}

export function hashPassword(password: string) {
  return hashPasswordValue(password, 12);
}

export function hashAdministratorAssignedPassword(password: string) {
  return hashPasswordValue(password, 1);
}

export async function verifyPassword(password: string, stored: string) {
  try {
    const [algorithm, iterationsValue, saltValue, hashValue] =
      stored.split("$");
    if (algorithm !== "pbkdf2-sha256") return false;
    const iterations = Number(iterationsValue);
    if (!Number.isSafeInteger(iterations) || iterations < 100_000) return false;
    const expected = base64UrlToBytes(hashValue);
    const actual = await derivePassword(
      password,
      base64UrlToBytes(saltValue),
      iterations,
    );
    const subtle = crypto.subtle as SubtleCrypto & {
      timingSafeEqual?: (
        left: ArrayBufferView,
        right: ArrayBufferView,
      ) => boolean;
    };
    if (subtle.timingSafeEqual) return subtle.timingSafeEqual(actual, expected);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1)
      difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function randomToken(bytes = 32) {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function encryptionKey() {
  const bytes = base64UrlToBytes(requiredSecret("DATA_ENCRYPTION_KEY"));
  if (bytes.length !== 32)
    throw new Error(
      "DATA_ENCRYPTION_KEY must be a base64url-encoded 256-bit key",
    );
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptCustomerValue(value: string) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    await encryptionKey(),
    encoder.encode(value),
  );
  return `v1.${bytesToBase64Url(nonce)}.${bytesToBase64Url(new Uint8Array(ciphertext))}`;
}

export async function decryptCustomerValue(value: string) {
  const [version, nonceValue, ciphertextValue] = value.split(".");
  if (version !== "v1" || !nonceValue || !ciphertextValue)
    throw new Error("Encrypted customer value is invalid");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(nonceValue) },
    await encryptionKey(),
    base64UrlToBytes(ciphertextValue),
  );
  return decoder.decode(plaintext);
}

export function generateDataEncryptionKey() {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}
