/**
 * HelloBooks YouTube video catalog — mirrored from the marketing-site
 * source-of-truth at Web-Fire-hellobooks.ai/src/config/homepageVideos.ts.
 *
 * Public-only data: video title, description, category and YouTube IDs/URLs
 * shown on the public homepage. No customer data.
 *
 * Scope note: this mirrors the videos the marketing site curates (homepage
 * hero + gallery). It is NOT a live mirror of every upload on the
 * @hellobooksai channel — for the full catalog, point the user at
 * YOUTUBE_CHANNEL.url.
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

export const VIDEOS: Video[] = VIDEO_SEEDS.map((v) => ({
  id: v.id,
  title: v.title,
  description: v.description,
  category: v.category,
  featured: v.featured,
  watchUrl: `https://www.youtube.com/watch?v=${v.id}`,
  embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}?rel=0&modestbranding=1&playsinline=1&controls=1`,
  thumbnailUrl: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
}));
