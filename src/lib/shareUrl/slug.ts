/**
 * URL-safe random slug generator for share URLs.
 *
 * 12 chars from a 64-char alphabet = 64^12 ≈ 4.7e21 keyspace. At the share
 * surface's expected traffic the collision probability is negligible; the
 * store still does a `has()` check before insert just in case.
 *
 * `crypto.randomBytes` is exposed via dynamic import for testability — a
 * test can stub the RNG to assert collision-handling. Stay synchronous in
 * the hot path; only the initial import is async.
 */

import { randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
// 56 chars — drops 0/O/1/l/I to avoid ambiguous-character confusion when
// a user copy-pastes a slug from a printout. 56^12 ≈ 1.9e21 keyspace.

const SLUG_LENGTH = 12;

export function generateSlug(): string {
  const bytes = randomBytes(SLUG_LENGTH);
  let out = '';
  for (let i = 0; i < SLUG_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** True iff `s` matches the slug shape — used by the GET /r/:slug guard. */
export function isValidSlug(s: string): boolean {
  if (typeof s !== 'string') return false;
  if (s.length !== SLUG_LENGTH) return false;
  for (let i = 0; i < s.length; i++) {
    if (!ALPHABET.includes(s[i])) return false;
  }
  return true;
}
