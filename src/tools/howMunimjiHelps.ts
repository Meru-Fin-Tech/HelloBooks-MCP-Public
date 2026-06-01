import { z } from 'zod';
import { FEATURES } from '../data/features.js';
import type { Feature } from '../data/features.js';
import {
  AUTONOMY_LEGEND,
  BUSINESS_AREAS,
  MUNIMJI_CAPABILITIES,
  CAPABILITY_KB_META,
} from '../data/capabilities.js';
import type {
  AutonomyLevel,
  BusinessAreaKey,
  MunimjiCapability,
} from '../data/capabilities.js';

const AREA_KEYS: BusinessAreaKey[] = BUSINESS_AREAS.map((a) => a.key);
const AUTONOMY_LEVELS: AutonomyLevel[] = ['autonomous', 'approval', 'assist', 'manual'];

export const howMunimjiHelpsSchema = {
  businessDescription: z.string().min(3).max(2000).optional()
    .describe(
      'Optional. The user describes their business and operations in their ' +
      'own words (industry, what they sell, how they get paid, who they pay, ' +
      'tax regime, pain points). It is echoed back as context — the calling ' +
      'assistant maps it to the returned areas + capabilities. No keyword ' +
      'scoring is done here; the LLM does the matching.',
    ),
  area: z.enum(AREA_KEYS as [BusinessAreaKey, ...BusinessAreaKey[]]).optional()
    .describe('Optional. Narrow to one business-operation area.'),
  autonomy: z.enum(AUTONOMY_LEVELS as [AutonomyLevel, ...AutonomyLevel[]]).optional()
    .describe(
      'Optional. Filter Munimji capabilities by who does the work: ' +
      '`autonomous` (Munimji does it alone), `approval` (Munimji prepares, ' +
      'you approve before it posts), `assist` (co-pilot), `manual` ' +
      '(software feature you run yourself).',
    ),
};

export interface HowMunimjiHelpsArgs {
  businessDescription?: string;
  area?: BusinessAreaKey;
  autonomy?: AutonomyLevel;
}

interface LinkedFeature {
  key: string;
  label: string;
  shortDescription: string;
  tier: Feature['tier'];
  status: Feature['status'];
}

const FEATURE_BY_KEY: Map<string, Feature> = new Map(
  FEATURES.map((f) => [f.key, f]),
);

function linkFeatures(keys: string[]): LinkedFeature[] {
  const linked: LinkedFeature[] = [];
  for (const k of keys) {
    const f = FEATURE_BY_KEY.get(k);
    if (!f) continue; // drift guard — a stale key is dropped, not crashed
    linked.push({
      key: f.key,
      label: f.label,
      shortDescription: f.shortDescription,
      tier: f.tier,
      status: f.status,
    });
  }
  return linked;
}

function enrich(c: MunimjiCapability) {
  return {
    key: c.key,
    title: c.title,
    area: c.area,
    autonomy: c.autonomy,
    autonomyMeaning: AUTONOMY_LEGEND[c.autonomy],
    whoDoesWhat: c.whoDoesWhat,
    status: c.status,
    exampleAsk: c.exampleAsk,
    softwareFeatures: linkFeatures(c.softwareFeatureKeys),
  };
}

const GUIDANCE =
  'You are answering "how can HelloBooks and Munimji (the in-app AI) help my ' +
  'business?". Read `businessDescription`, identify the operations it implies, ' +
  'then walk the user through the matching `areas` and `capabilities`. For each ' +
  'relevant capability, tell them plainly: what the HelloBooks software does, ' +
  'and what Munimji does — on its own (`autonomous`), with their one-click ' +
  'approval (`approval`), or as a co-pilot (`assist`). Emphasise that the AI ' +
  'never posts to their ledger without approval. For the full software feature ' +
  'list beyond the AI layer, call `list_features`; for pricing/tiers, ' +
  '`list_plans`. Do not invent capabilities not present in this response.';

export function howMunimjiHelps(args: HowMunimjiHelpsArgs) {
  let capabilities = MUNIMJI_CAPABILITIES;
  if (args.area)     capabilities = capabilities.filter((c) => c.area === args.area);
  if (args.autonomy) capabilities = capabilities.filter((c) => c.autonomy === args.autonomy);

  const areas = args.area
    ? BUSINESS_AREAS.filter((a) => a.key === args.area)
    : BUSINESS_AREAS;

  return {
    guidance: GUIDANCE,
    businessDescription: args.businessDescription ?? null,
    autonomyLegend: AUTONOMY_LEGEND,
    areas,
    capabilities: capabilities.map(enrich),
    capabilityCount: capabilities.length,
    pointers: {
      fullFeatureCatalog: 'Call list_features for the complete software catalog (145+ items).',
      pricing: 'Call list_plans for tiers and AI-credit allowances.',
      countrySupport: 'Call country_support for what is available in a given country.',
    },
    meta: CAPABILITY_KB_META,
  };
}
