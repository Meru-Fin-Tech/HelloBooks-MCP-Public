/**
 * URL-safe random slug generator for share URLs.
 *
 * 12 chars from a 56-char alphabet = 56^12 ≈ 1.9e21 keyspace. At the share
 * surface's expected traffic the collision probability is negligible; the
 * store still does a `has()` check before insert just in case.
 *
 * `crypto.randomBytes` backs the RNG. Characters are drawn with rejection
 * sampling (not `byte % 56`) so every alphabet character is equiprobable —
 * a plain modulo of a 0–255 byte over 56 biases the first 32 characters
 * (256 = 4·56 + 32), shrinking the effective keyspace.
 */

import { randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
// 56 chars — drops 0/O/1/l/I to avoid ambiguous-character confusion when
// a user copy-pastes a slug from a printout. 56^12 ≈ 1.9e21 keyspace.

const SLUG_LENGTH = 12;

// Largest multiple of the alphabet size that fits in a byte. Bytes at or above
// this are rejected so the modulo below is unbiased.
const REJECT_THRESHOLD = 256 - (256 % ALPHABET.length);

export function generateSlug(): string {
  let out = '';
  while (out.length < SLUG_LENGTH) {
    // Over-allocate so the common case needs a single syscall; top up only if
    // an unlucky run of high bytes gets rejected.
    for (const byte of randomBytes(SLUG_LENGTH)) {
      if (byte >= REJECT_THRESHOLD) continue;
      out += ALPHABET[byte % ALPHABET.length];
      if (out.length === SLUG_LENGTH) break;
    }
  }
  return out;
}

/** True iff `s` matches the slug shape — used by the GET /r/:slug guard. */
export function isValidSlug(s: string): boolean {
  if (typeof s !== 'string') return false;
  if (s.length !== SLUG_LENGTH) return false;
  for (const ch of s) {
    if (!ALPHABET.includes(ch)) return false;
  }
  return true;
}
