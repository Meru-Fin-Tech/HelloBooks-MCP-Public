import { ABOUT_MARKDOWN, CHANGELOG } from '../data/about.js';
import { COMPETITORS } from '../data/competitors.js';
import type { Competitor } from '../data/competitors.js';
import {
  FEATURES,
  FEATURE_CATEGORIES,
  FEATURE_CATALOG_META,
} from '../data/features.js';
import {
  AUTONOMY_LEGEND,
  BUSINESS_AREAS,
  MUNIMJI_CAPABILITIES,
  CAPABILITY_KB_META,
} from '../data/capabilities.js';

export interface ResourceDescriptor {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

const COMPARISON_IDS = ['quickbooks', 'xero', 'zoho-books', 'tally'] as const;
type ComparisonId = typeof COMPARISON_IDS[number];

const COMPARISON_RESOURCES: ResourceDescriptor[] = COMPARISON_IDS.map((id) => {
  const c = competitorById(id);
  return {
    uri: `hellobooks://comparison/${id}`,
    name: `HelloBooks vs ${c.name}`,
    description: `Honest positioning comparison: where HelloBooks wins, where ${c.name} wins, and public pricing posture.`,
    mimeType: 'text/markdown',
  };
});

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
  {
    uri: 'hellobooks://capabilities',
    name: 'HelloBooks Munimji Capability Knowledge Base',
    description: 'The live "what can HelloBooks + the Munimji AI do for my business?" knowledge base: 10 business-operation areas, the AI-autonomy layer (autonomous / approval / assist / manual — what Munimji does on its own vs with your one-click approval), and links into the feature catalog. Same data the how_munimji_helps tool returns. The AI never posts to the ledger without approval.',
    mimeType: 'application/json',
  },
  ...COMPARISON_RESOURCES,
];

function competitorById(id: ComparisonId): Competitor {
  const c = COMPETITORS.find((x) => x.id === id);
  if (!c) throw new Error(`Comparison resource expects competitor "${id}" in COMPETITORS catalog.`);
  return c;
}

function renderComparison(c: Competitor): string {
  const wins = c.whereWeWin.map((line) => `- ${line}`).join('\n');
  const losses = c.whereTheyWin.map((line) => `- ${line}`).join('\n');
  const pricing = c.pricingNote ? `\n\n## Pricing posture (${c.name})\n\n${c.pricingNote}` : '';
  const links = [
    c.publicUrl ? `- ${c.name}: ${c.publicUrl}` : null,
    c.comparisonUrl ? `- HelloBooks comparison page: ${c.comparisonUrl}` : null,
  ].filter((x): x is string => x !== null).join('\n');
  const linksSection = links ? `\n\n## Links\n\n${links}` : '';

  return `# HelloBooks vs ${c.name}

${c.positioningSummary}

## Where HelloBooks wins

${wins}

## Where ${c.name} wins

${losses}${pricing}${linksSection}

---

_Segment: ${c.segment}. Primary market: ${c.primaryCountry}. Also evaluated in: ${c.alsoIn.join(', ') || '—'}._
`;
}

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
  if (uri === 'hellobooks://capabilities') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              ...CAPABILITY_KB_META,
              autonomyLegend: AUTONOMY_LEGEND,
              areas: BUSINESS_AREAS,
              capabilities: MUNIMJI_CAPABILITIES,
              capabilityCount: MUNIMJI_CAPABILITIES.length,
              areaCount: BUSINESS_AREAS.length,
            },
            null,
            2,
          ),
        },
      ],
    };
  }
  for (const id of COMPARISON_IDS) {
    if (uri === `hellobooks://comparison/${id}`) {
      return {
        contents: [
          { uri, mimeType: 'text/markdown', text: renderComparison(competitorById(id)) },
        ],
      };
    }
  }
  throw new Error(`Unknown resource URI: ${uri}`);
}
