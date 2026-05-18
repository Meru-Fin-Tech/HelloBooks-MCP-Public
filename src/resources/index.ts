import { ABOUT_MARKDOWN, CHANGELOG } from '../data/about.js';
import {
  FEATURES,
  FEATURE_CATEGORIES,
  FEATURE_CATALOG_META,
} from '../data/features.js';

export interface ResourceDescriptor {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const RESOURCES: ResourceDescriptor[] = [
  {
    uri: 'hellobooks://about',
    name: 'About HelloBooks',
    description: 'Markdown product summary covering features, plans, integrations, and supported markets.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'hellobooks://changelog',
    name: 'HelloBooks Changelog',
    description: 'Most recent release notes (features, fixes, compliance updates).',
    mimeType: 'application/json',
  },
  {
    uri: 'hellobooks://feature-catalog',
    name: 'HelloBooks Feature Catalog',
    description: 'Full marketing feature catalog mirrored from marketing/feature-catalog.json — 96+ features across 13 categories with tier, status, marketed flag, and competitor parity.',
    mimeType: 'application/json',
  },
];

export function readResource(uri: string): { contents: { uri: string; mimeType: string; text: string }[] } {
  if (uri === 'hellobooks://about') {
    return {
      contents: [{ uri, mimeType: 'text/markdown', text: ABOUT_MARKDOWN }],
    };
  }
  if (uri === 'hellobooks://changelog') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            { count: CHANGELOG.length, entries: CHANGELOG },
            null,
            2,
          ),
        },
      ],
    };
  }
  if (uri === 'hellobooks://feature-catalog') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              ...FEATURE_CATALOG_META,
              categories: FEATURE_CATEGORIES,
              features: FEATURES,
              featureCount: FEATURES.length,
              categoryCount: FEATURE_CATEGORIES.length,
            },
            null,
            2,
          ),
        },
      ],
    };
  }
  throw new Error(`Unknown resource URI: ${uri}`);
}
