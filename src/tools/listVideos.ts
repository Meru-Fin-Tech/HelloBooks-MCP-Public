import { z } from 'zod';
import { VIDEOS, YOUTUBE_CHANNEL } from '../data/videos.js';
import type { Video, VideoCategory } from '../data/videos.js';

export const listVideosSchema = {
  category: z.enum(['demo', 'features', 'overview']).optional()
    .describe('Filter to one video category (demo, features, overview).'),
  featuredOnly: z.boolean().optional()
    .describe('If true, only return videos flagged as featured on the marketing site.'),
  query: z.string().min(2).max(120).optional()
    .describe('Optional substring match against video title, description and topic label (e.g. "GST filing", "payroll").'),
  limit: z.number().int().min(1).max(200).optional()
    .describe('Maximum videos to return (default 25). `total` in the response is the full match count; raise limit or narrow with query to see more.'),
};

export interface ListVideosArgs {
  category?: VideoCategory;
  featuredOnly?: boolean;
  query?: string;
  limit?: number;
}

function matchesQuery(v: Video, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    v.title.toLowerCase().includes(needle) ||
    v.description.toLowerCase().includes(needle) ||
    (v.topic?.toLowerCase().includes(needle) ?? false)
  );
}

const DEFAULT_LIMIT = 25;

export function listVideos(args: ListVideosArgs) {
  let results: Video[] = VIDEOS;
  if (args.category)    results = results.filter((v) => v.category === args.category);
  if (args.featuredOnly) results = results.filter((v) => v.featured);
  if (args.query)       results = results.filter((v) => matchesQuery(v, args.query!));

  const total = results.length;
  const shown = results.slice(0, args.limit ?? DEFAULT_LIMIT);

  return {
    videos: shown,
    count: shown.length,
    total,
    channel: YOUTUBE_CHANNEL,
    note:
      'These are the videos curated on the HelloBooks marketing site (homepage plus the per-page registry), ' +
      'each with a real upload date, duration and a hellobooks.ai/videos/<slug> watch page where available. ' +
      'Results are capped by `limit` (default 25) — `total` is the full match count. This is not a live mirror of the full YouTube channel. For every upload, ' +
      `see ${YOUTUBE_CHANNEL.url}.`,
    source: 'https://hellobooks.ai',
  };
}
