import { FEATURES, FEATURE_CATEGORIES } from '../data/features.js';

export const listFeatureCategoriesSchema = {};

export interface ListFeatureCategoriesArgs {}

export function listFeatureCategories(_args: ListFeatureCategoriesArgs = {}) {
  const counts = new Map<string, { live: number; beta: number; planned: number; total: number }>();
  for (const f of FEATURES) {
    const bucket = counts.get(f.category) ?? { live: 0, beta: 0, planned: 0, total: 0 };
    bucket[f.status] += 1;
    bucket.total += 1;
    counts.set(f.category, bucket);
  }

  const categories = FEATURE_CATEGORIES
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      ...c,
      featureCounts: counts.get(c.key) ?? { live: 0, beta: 0, planned: 0, total: 0 },
    }));

  return {
    categories,
    count: categories.length,
    source: 'https://hellobooks.ai',
  };
}
