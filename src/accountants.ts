import { z } from 'zod';

export const ACCOUNTANT_SOURCE = 'https://hellobooks.ai/api/feed/accountants.json';
export const DIRECTORY_URL = 'https://hellobooks.ai/find-an-accountant';
const text = z.string().optional();
const strings = z.array(z.string()).optional();
const number = z.number().finite().optional();

/** Only fields explicitly published by the directory belong in this service. */
export const accountantSchema = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/), firm_name: z.string().min(1),
  principal_name: text, photo_url: text, photo_url_absolute: z.string().nullable().optional(),
  country: z.string(), state: text, state_slug: text, city: text, city_slug: text,
  credentials: strings, license_no: text, specialties: strings, industries: strings,
  languages: strings, years_experience: number, years_in_practice: number,
  firm_size: text, accepting_clients: z.boolean().optional(), bio_short: text, bio_long: text,
  engagement_models: strings, starting_price_monthly_usd: number, starting_price_monthly_inr: number,
  email_public: text, phone_public: text, whatsapp_public: text, website: text, linkedin: text,
  response_time_hours: number, hellobooks_certified: z.boolean().optional(),
  clients_on_hellobooks: number, years_on_hellobooks: number, certifications: strings,
  partnership_levels: strings, tier: text, listed_since: text, google_place_id: text,
  verifications: z.array(z.object({ kind: z.string(), verified_on: z.string(), reference_url: text })).optional(),
  firm_qa: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  computed_badges: z.array(z.object({ slug: z.string(), label: z.string(), description: z.string() })).optional(),
  profile_url: text,
});
export type Accountant = z.infer<typeof accountantSchema>;
const feedSchema = z.object({
  firms: z.array(accountantSchema), updatedAt: text,
  taxonomies: z.record(z.unknown()).optional(),
  _meta: z.object({ complete: z.literal(true), dataSource: z.literal('live'), firmCount: z.number().int().nonnegative() }),
});
export interface DirectorySnapshot {
  firms: Accountant[];
  taxonomies: Record<string, unknown>;
  source: string;
  status: 'live' | 'stale' | 'unavailable';
  fetchedAt: string | null;
  updatedAt: string | null;
  error?: string;
}

/** Coalesce requests, validate the whole feed, and never confuse failure with zero firms. */
export function createDirectoryLoader(options: {
  url?: string; fetcher?: typeof fetch; now?: () => number; ttlMs?: number;
} = {}) {
  const url = options.url ?? ACCOUNTANT_SOURCE;
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  const ttl = options.ttlMs ?? 300_000;
  let snapshot: DirectorySnapshot | undefined;
  let expires = 0;
  let pending: Promise<DirectorySnapshot> | undefined;
  return async function load(): Promise<DirectorySnapshot> {
    if (snapshot && now() < expires) return snapshot;
    if (pending) return pending;
    pending = (async () => {
      try {
        const response = await fetcher(url, {
          headers: { Accept: 'application/json', 'User-Agent': 'HelloBooks-Public-MCP/1.5' },
          signal: AbortSignal.timeout(10_000), redirect: 'error',
        });
        if (!response.ok) throw new Error('directory-source-unavailable');
        const data = feedSchema.parse(await response.json());
        if (data._meta.firmCount !== data.firms.length ||
            new Set(data.firms.map(f => f.slug)).size !== data.firms.length) {
          throw new Error('directory-source-incomplete');
        }
        snapshot = {
          firms: data.firms, taxonomies: data.taxonomies ?? {}, source: ACCOUNTANT_SOURCE,
          status: 'live', fetchedAt: new Date(now()).toISOString(), updatedAt: data.updatedAt ?? null,
        };
        expires = now() + ttl;
      } catch {
        snapshot = snapshot?.fetchedAt
          ? { ...snapshot, status: 'stale', error: 'The directory source is temporarily unavailable. These are the last fetched profiles.' }
          : { firms: [], taxonomies: {}, source: ACCOUNTANT_SOURCE, status: 'unavailable', fetchedAt: null, updatedAt: null,
              error: 'The directory source is temporarily unavailable. Try again shortly or open the source directory.' };
        expires = now() + 30_000;
      }
      return snapshot;
    })();
    try { return await pending; } finally { pending = undefined; }
  };
}

export const loadDirectory = createDirectoryLoader({ url: process.env.HELLOBOOKS_MCP_ACCOUNTANTS_FEED_URL });
export const listAccountantsSchema = {
  query: z.string().max(200).optional().describe('Search firm, principal, biography, location, specialties, industries, credentials or language.'),
  country: z.string().max(80).optional().describe('Directory country slug, e.g. united-states, india. Omit for all countries.'),
  city: z.string().max(100).optional(), specialty: z.string().max(100).optional(),
  acceptingClients: z.boolean().optional().describe('Omit to include every published firm, including those not accepting new clients.'),
  page: z.number().int().min(1).max(1_000_000).optional(),
  pageSize: z.number().int().min(1).max(100).optional().describe('Default 25. Follow nextPage until null to retrieve every matching full profile.'),
};
export type AccountantQuery = z.infer<z.ZodObject<typeof listAccountantsSchema>>;

export function queryAccountants(snapshot: DirectorySnapshot, args: AccountantQuery = {}) {
  const normalized = (value: string) => value.toLowerCase().trim();
  const terms = normalized(args.query ?? '').split(/\s+/).filter(Boolean);
  const matches = snapshot.firms.filter(firm => {
    if (args.country && normalized(firm.country) !== normalized(args.country)) return false;
    if (args.city && !normalized(`${firm.city ?? ''} ${firm.city_slug ?? ''}`).includes(normalized(args.city))) return false;
    if (args.specialty && !firm.specialties?.some(s => normalized(s).includes(normalized(args.specialty!)))) return false;
    if (args.acceptingClients !== undefined && firm.accepting_clients !== args.acceptingClients) return false;
    const haystack = normalized([firm.firm_name, firm.principal_name, firm.country, firm.state, firm.city,
      firm.bio_short, firm.bio_long, ...firm.specialties ?? [], ...firm.industries ?? [],
      ...firm.credentials ?? [], ...firm.languages ?? []].join(' '));
    return terms.every(term => haystack.includes(term));
  }).sort((a, b) => a.firm_name.localeCompare(b.firm_name) || a.slug.localeCompare(b.slug));
  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 25;
  const totalPages = Math.ceil(matches.length / pageSize);
  return {
    firms: matches.slice((page - 1) * pageSize, page * pageSize),
    total: matches.length, directoryTotal: snapshot.firms.length, page, pageSize, totalPages,
    nextPage: page < totalPages ? page + 1 : null,
    source: snapshot.source, directoryUrl: DIRECTORY_URL, taxonomies: snapshot.taxonomies,
    countries: [...new Set(snapshot.firms.map(firm => firm.country))].sort(),
    status: snapshot.status, fetchedAt: snapshot.fetchedAt, updatedAt: snapshot.updatedAt,
    ...(snapshot.error ? { error: snapshot.error } : {}),
  };
}
export async function listAccountants(args: AccountantQuery = {}) {
  return queryAccountants(await loadDirectory(), args);
}
export function queryAccountant(snapshot: DirectorySnapshot, slug: string) {
  const firm = snapshot.firms.find(f => f.slug === slug) ?? null;
  return { firm, found: firm ? true : snapshot.status === 'live' ? false : null, status: snapshot.status, source: snapshot.source,
    fetchedAt: snapshot.fetchedAt, ...(snapshot.error ? { error: snapshot.error } : {}) };
}

export async function getAccountant(args: { slug: string }) {
  return queryAccountant(await loadDirectory(), args.slug);
}
