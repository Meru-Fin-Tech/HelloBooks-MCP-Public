/**
 * In-memory share-URL payload store with TTL and capacity cap.
 *
 * Design constraints:
 *   • Single-process — multi-instance deploys lose cross-instance slugs.
 *     Acceptable for the funnel use case because re-running mints a fresh
 *     slug. Redis backing can be a future migration if Day-30 metrics
 *     justify the infra.
 *   • Bounded memory — caps total entries; on capacity hit, evicts the
 *     earliest-expiring entry (oldest-TTL-first, not LRU — TTL-first is
 *     the right policy because expired entries cost nothing to keep
 *     until reap).
 *   • Lazy reap — eviction runs on `get` for expired entries and on a
 *     periodic interval. Both are O(1).
 *
 * Pure-data — no I/O, no HTTP. The HTTP route in src/http.ts wires this
 * to a `GET /r/:slug` handler.
 */

import type { SharePayload, ShareStoreEntry } from './types.js';
import { generateSlug } from './slug.js';

export interface ShareStoreOptions {
  /** Default time-to-live for new entries, in milliseconds. */
  ttlMs?: number;
  /** Max number of entries before TTL-first eviction kicks in. */
  capacity?: number;
  /** Override Date.now() for testing. */
  now?: () => number;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_CAPACITY = 10_000;
const MAX_SLUG_ATTEMPTS = 5;

export class ShareStore {
  private readonly entries = new Map<string, ShareStoreEntry>();
  private readonly ttlMs: number;
  private readonly capacity: number;
  private readonly now: () => number;

  constructor(opts: ShareStoreOptions = {}) {
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    this.capacity = opts.capacity ?? DEFAULT_CAPACITY;
    this.now = opts.now ?? Date.now;
  }

  /** Number of live (non-expired) entries — used by /health metrics. */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Mint a fresh slug and store the payload under it. Returns the slug
   * plus the absolute expiry. Caller is responsible for building the
   * public URL using its own host config.
   */
  mint(payload: SharePayload): { slug: string; expiresAt: number; createdAt: number } {
    let slug: string | null = null;
    for (let i = 0; i < MAX_SLUG_ATTEMPTS; i++) {
      const candidate = generateSlug();
      if (!this.entries.has(candidate)) {
        slug = candidate;
        break;
      }
    }
    if (slug === null) {
      // Astronomically unlikely; surface as an explicit error rather than
      // letting silent collision corrupt a previous entry.
      throw new Error('Share-URL slug generator exceeded collision retries');
    }

    const createdAt = this.now();
    const expiresAt = createdAt + this.ttlMs;
    const entry: ShareStoreEntry = { slug, payload, expiresAt, createdAt };

    if (this.entries.size >= this.capacity) {
      this.evictEarliest();
    }
    this.entries.set(slug, entry);
    return { slug, expiresAt, createdAt };
  }

  /**
   * Return the payload for `slug`, or null when missing / expired. Expired
   * entries are reaped lazily on access.
   */
  get(slug: string): SharePayload | null {
    const entry = this.entries.get(slug);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(slug);
      return null;
    }
    return entry.payload;
  }

  /** Force-delete a slug. Returns true if it existed. */
  delete(slug: string): boolean {
    return this.entries.delete(slug);
  }

  /**
   * Sweep expired entries. Called periodically by the HTTP server (or by
   * tests calling it directly). O(n) but n is bounded by capacity.
   */
  sweepExpired(): number {
    const now = this.now();
    let removed = 0;
    for (const [slug, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(slug);
        removed++;
      }
    }
    return removed;
  }

  private evictEarliest(): void {
    let earliestSlug: string | null = null;
    let earliestExpiry = Infinity;
    for (const [slug, entry] of this.entries) {
      if (entry.expiresAt < earliestExpiry) {
        earliestExpiry = entry.expiresAt;
        earliestSlug = slug;
      }
    }
    if (earliestSlug !== null) {
      this.entries.delete(earliestSlug);
    }
  }
}

/**
 * Default singleton — wired into src/http.ts. Tests should construct their
 * own ShareStore with deterministic `now`/`ttlMs`.
 */
export const defaultShareStore = new ShareStore();
