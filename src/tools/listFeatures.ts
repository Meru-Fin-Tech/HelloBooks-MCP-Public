import { z } from 'zod';
import {
  FEATURES,
  FEATURE_CATEGORIES,
  FEATURE_CATALOG_META,
} from '../data/features.js';
import type {
  Feature,
  FeatureCategoryKey,
  FeatureStatus,
  FeatureTier,
} from '../data/features.js';

const CATEGORY_KEYS: FeatureCategoryKey[] = FEATURE_CATEGORIES.map((c) => c.key);
const TIERS: FeatureTier[] = [
  'free', 'pro', 'cpa', 'warehouse-addon', 'manufacturing-addon',
];

export const listFeaturesSchema = {
  category: z.enum(CATEGORY_KEYS as [FeatureCategoryKey, ...FeatureCategoryKey[]])
    .optional()
    .describe('Filter to one feature category (core-accounting, invoicing-billing, etc.).'),
  tier: z.enum(TIERS as [FeatureTier, ...FeatureTier[]])
    .optional()
    .describe('Filter by the minimum plan tier / add-on that unlocks the feature.'),
  status: z.enum(['live', 'beta', 'planned'])
    .optional()
    .describe('Filter by rollout status. Defaults to all.'),
  marketedOnly: z.boolean().optional()
    .describe('If true, only return features marketed on the public website.'),
  query: z.string().min(2).max(120).optional()
    .describe('Optional substring match against label + shortDescription.'),
  limit: z.number().int().min(1).max(200).optional()
    .describe('Max number of features to return. Default 200.'),
};

export interface ListFeaturesArgs {
  category?: FeatureCategoryKey;
  tier?: FeatureTier;
  status?: FeatureStatus;
  marketedOnly?: boolean;
  query?: string;
  limit?: number;
}

function matchesQuery(f: Feature, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    f.label.toLowerCase().includes(needle) ||
    f.shortDescription.toLowerCase().includes(needle) ||
    f.key.toLowerCase().includes(needle)
  );
}

export function listFeatures(args: ListFeaturesArgs) {
  const limit = args.limit ?? 200;
  let results: Feature[] = FEATURES;

  if (args.category)     results = results.filter((f) => f.category === args.category);
  if (args.tier)         results = results.filter((f) => f.tier === args.tier);
  if (args.status)       results = results.filter((f) => f.status === args.status);
  if (args.marketedOnly) results = results.filter((f) => f.marketed);
  if (args.query)        results = results.filter((f) => matchesQuery(f, args.query!));

  const truncated = results.length > limit;
  const slice = results.slice(0, limit);

  return {
    features: slice,
    count: slice.length,
    totalMatches: results.length,
    truncated,
    catalogVersion: FEATURE_CATALOG_META.version,
    lastUpdated: FEATURE_CATALOG_META.lastUpdated,
    source: 'https://hellobooks.ai',
  };
}
