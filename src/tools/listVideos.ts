import { z } from 'zod';
import { VIDEOS, YOUTUBE_CHANNEL } from '../data/videos.js';
import type { Video, VideoCategory } from '../data/videos.js';

export const listVideosSchema = {
  category: z.enum(['demo', 'features', 'overview']).optional()
    .describe('Filter to one video category (demo, features, overview).'),
  featuredOnly: z.boolean().optional()
    .describe('If true, only return videos flagged as featured on the marketing site.'),
  query: z.string().min(2).max(120).optional()
    .describe('Optional substring match against video title + description.'),
};

export interface ListVideosArgs {
  category?: VideoCategory;
  featuredOnly?: boolean;
  query?: string;
}

function matchesQuery(v: Video, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    v.title.toLowerCase().includes(needle) ||
    v.description.toLowerCase().includes(needle)
  );
}

export function listVideos(args: ListVideosArgs) {
  let results: Video[] = VIDEOS;
  if (args.category)    results = results.filter((v) => v.category === args.category);
  if (args.featuredOnly) results = results.filter((v) => v.featured);
  if (args.query)       results = results.filter((v) => matchesQuery(v, args.query!));

  return {
    videos: results,
    count: results.length,
    channel: YOUTUBE_CHANNEL,
    note:
      'This is the set of videos curated on the HelloBooks marketing site, ' +
      'not a live mirror of the full YouTube channel. For every upload, ' +
      `see ${YOUTUBE_CHANNEL.url}.`,
    source: 'https://hellobooks.ai',
  };
}
