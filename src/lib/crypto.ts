import type { DownloadBundle } from "@/types/api";

/**
 * Helper to convert a Base64 string to a Uint8Array.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decrypts a DownloadBundle using the Web Crypto API.
 * Uses AES-GCM with the provided key and nonce.
 */
export async function decryptBundle(bundle: DownloadBundle): Promise<Uint8Array> {
  if (!bundle.ciphertextB64 || !bundle.keyB64 || !bundle.nonceB64) {
    throw new Error("Missing decryption materials in bundle");
  }

  const ciphertext = base64ToUint8Array(bundle.ciphertextB64);
  const keyBytes = base64ToUint8Array(bundle.keyB64);
  const nonceBytes = base64ToUint8Array(bundle.nonceB64);

  // Import the raw key into a CryptoKey
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as BufferSource,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // Decrypt the payload
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: nonceBytes as unknown as BufferSource,
    },
    key,
    ciphertext as unknown as BufferSource
  );

  return new Uint8Array(decryptedBuffer);
}
