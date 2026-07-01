/**
 * Hashes a raw byte array using SHA-256 and returns a lowercase hex string.
 *
 * Used by ApiAccessSection (browser side) to hash API tokens before persisting
 * them in Supabase user_metadata. The raw token is never sent to any server.
 *
 * The server-side copy in functions/api/share.js uses its own inline version
 * of this logic since Pages Functions cannot import from src/.
 */
export async function hashToken(rawBytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawBytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
