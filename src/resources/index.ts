import { ABOUT_MARKDOWN, CHANGELOG } from '../data/about.js';

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
    description: 'Last 50 release notes (features, fixes, compliance updates).',
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
  throw new Error(`Unknown resource URI: ${uri}`);
}
