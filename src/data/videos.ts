/**
 * HelloBooks YouTube video catalog — mirrored from the marketing-site
 * source-of-truth at Web-Fire-hellobooks.ai/src/config/homepageVideos.ts.
 *
 * Public-only data: video title, description, category and YouTube IDs/URLs
 * shown on the public homepage. No customer data.
 *
 * Scope note: this mirrors the videos the marketing site curates — the homepage
 * hero + gallery PLUS the per-page video registry (Web-Fire src/config/pageVideos.ts,
 * 193 distinct videos as of 2026-11-27, each with a real uploadDate and duration
 * and a hellobooks.ai/videos/<slug> watch page). It is NOT a live mirror of every
 * upload on the @hellobooksai channel — for the full catalog, point the user at
 * YOUTUBE_CHANNEL.url. Regenerate videoRegistry.json from the registry when the
 * marketing site adds videos.
 *
 * Federation note: once the marketing site exposes a video feed, switch
 * this module to fetch + cache from that endpoint and drop the static copy.
 */

export const YOUTUBE_CHANNEL = {
  handle: '@hellobooksai',
  url: 'https://www.youtube.com/@hellobooksai',
  description:
    'Official HelloBooks YouTube channel — product demos, feature walkthroughs ' +
    'and accounting how-to content.',
};

import REGISTRY from './videoRegistry.json' with { type: 'json' };

export type VideoCategory = 'demo' | 'features' | 'overview';

export interface Video {
  id: string; // YouTube video ID
  title: string;
  description: string;
  category: VideoCategory;
  featured: boolean;
  watchUrl: string;
  embedUrl: string;
  thumbnailUrl: string;
  /** Short feature/topic label from the marketing registry, e.g. "GST filing". */
  topic?: string;
  /** ISO date the video was published on YouTube (real registry value). */
  uploadDate?: string;
  /** ISO 8601 duration, e.g. PT2M45S (real registry value). */
  duration?: string;
  /** Dedicated watch page on the marketing site, https://hellobooks.ai/videos/<slug>. */
  watchPageUrl?: string;
  /** Marketing-site routes that embed this video. */
  featuredOn?: string[];
}

interface VideoSeed {
  id: string;
  title: string;
  description: string;
  category: VideoCategory;
  featured: boolean;
}

// Mirrors HERO_YOUTUBE_VIDEO_ID + HOMEPAGE_GALLERY_VIDEOS in homepageVideos.ts.
const VIDEO_SEEDS: VideoSeed[] = [
  {
    id: 'dPLgK5FCybo',
    title: 'HelloBooks Homepage Demo',
    description: 'The headline demo video featured on the HelloBooks homepage hero.',
    category: 'demo',
    featured: true,
  },
  {
    id: '7_PLftld8n8',
    title: 'HelloBooks Product Demo',
    description: 'See how HelloBooks streamlines bookkeeping workflows with an AI-first experience.',
    category: 'demo',
    featured: true,
  },
  {
    id: 'HShEvjECCuo',
    title: 'Explore Core Features',
    description: 'A quick walkthrough of the product experience and everyday accounting flows.',
    category: 'features',
    featured: false,
  },
  {
    id: '414G06fw8Z8',
    title: 'More HelloBooks In Action',
    description: 'Another demo exploring more of the HelloBooks interface and capabilities.',
    category: 'overview',
    featured: false,
  },
];

interface RegistryEntry {
  id: string;
  title: string;
  description: string;
  topic: string | null;
  uploadDate: string;
  duration: string;
  watchSlug: string;
  featuredOn: string[];
}

const MARKETING_ORIGIN = 'https://hellobooks.ai';

function build(id: string, fields: Omit<Video, 'id' | 'watchUrl' | 'embedUrl' | 'thumbnailUrl'>): Video {
  return {
    id,
    ...fields,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&controls=1`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

const registryById = new Map((REGISTRY as RegistryEntry[]).map((r) => [r.id, r] as const));

function registryFields(r: RegistryEntry | undefined): Partial<Video> {
  if (!r) return {};
  return {
    ...(r.topic ? { topic: r.topic } : {}),
    uploadDate: r.uploadDate,
    duration: r.duration,
    watchPageUrl: `${MARKETING_ORIGIN}/videos/${r.watchSlug}`,
    featuredOn: r.featuredOn,
  };
}

// Curated homepage videos first (featured flag preserved). When the same video is
// also in the registry, the registry's real title/description win — the curated
// seed copy for those is generic ("More HelloBooks In Action").
const curated: Video[] = VIDEO_SEEDS.map((v) => {
  const r = registryById.get(v.id);
  return build(v.id, {
    title: r?.title ?? v.title,
    description: r?.description ?? v.description,
    category: v.category,
    featured: v.featured,
    ...registryFields(r),
  });
});

const curatedIds = new Set(curated.map((v) => v.id));
const fromRegistry: Video[] = (REGISTRY as RegistryEntry[])
  .filter((r) => !curatedIds.has(r.id))
  .map((r) => build(r.id, {
    title: r.title,
    description: r.description,
    category: 'features',
    featured: false,
    ...registryFields(r),
  }));

export const VIDEOS: Video[] = [...curated, ...fromRegistry];
