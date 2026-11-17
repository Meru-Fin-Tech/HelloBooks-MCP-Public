/**
 * MCP Prompts — curated, one-click flows that clients (Claude, Cursor, …) can
 * offer directly, each wrapping the server's own tools so the model takes the
 * right next action instead of guessing which tool to call.
 *
 * A prompt here returns a single user-role message: a focused instruction that
 * names the exact tools to call for that intent. Arguments are plain strings
 * (the MCP prompt-argument contract). Everything references tools this server
 * actually exposes. Read-only by nature — a prompt only produces text.
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export interface PromptDef {
  name: string;
  description: string;
  argsSchema: Record<string, z.ZodType>;
  build: (args: Record<string, string | undefined>) => string;
}

export const PROMPTS: PromptDef[] = [
  {
    name: 'which_plan_for_me',
    description: 'Recommend the right HelloBooks plan and its first-year cost for a described business.',
    argsSchema: {
      country: z.string().optional().describe('ISO country code, e.g. IN, US, GB.'),
      needs: z.string().optional().describe('Comma-separated needs, e.g. "GST filing, multi-currency, API".'),
    },
    build: (a) => {
      const country = a.country?.trim();
      const needs = a.needs?.trim();
      return [
        'Recommend the best HelloBooks plan for this business, then show what it would cost.',
        country ? `Country: ${country}.` : 'Ask for the country if it matters for pricing.',
        needs ? `Needs: ${needs}.` : 'If needs are unclear, ask one clarifying question first.',
        '',
        'Steps:',
        `1. Call recommend_plan${country ? ` with country="${country}"` : ''}${needs ? ` and needs split from "${needs}"` : ''}.`,
        '2. Call estimate_annual_cost for the recommended plan (same country, annual billing) to show the first-year total and the annual-billing saving.',
        '3. Summarise: the recommended tier, why, the price, and the signup URL. Note it is a list-price estimate, not a quote.',
      ].join('\n');
    },
  },
  {
    name: 'compare_to_competitor',
    description: 'Compare HelloBooks against a named competitor for a given market.',
    argsSchema: {
      competitor: z.string().describe('Competitor name or id, e.g. QuickBooks, Xero, Tally, Zoho Books.'),
      country: z.string().optional().describe('ISO country code for pricing/market context.'),
    },
    build: (a) => {
      const competitor = a.competitor?.trim() || 'the competitor';
      const country = a.country?.trim();
      return [
        `Give a balanced comparison of HelloBooks vs ${competitor}${country ? ` for ${country}` : ''}.`,
        '',
        'Steps:',
        `1. Call list_competitors with id or query for "${competitor}" to get where HelloBooks wins, where ${competitor} wins, and pricing notes.`,
        `2. Call feature_search for "${competitor} alternative" and any capability the user cares about.`,
        country ? `3. Call list_plans with country="${country}" for current HelloBooks pricing to compare.` : '3. Call list_plans for current HelloBooks pricing.',
        '4. Present a fair, sourced summary — strengths on both sides, not just HelloBooks. Link the comparison page if one is returned.',
      ].join('\n');
    },
  },
  {
    name: 'whats_due_next',
    description: 'List the upcoming statutory filing deadlines for a country, soonest first.',
    argsSchema: {
      country: z.string().describe('ISO country code, e.g. IN, GB, AU, US, CA.'),
      withinDays: z.string().optional().describe('Optional window in days, e.g. 30 or 90.'),
    },
    build: (a) => {
      const country = a.country?.trim() || 'the country';
      const within = a.withinDays?.trim();
      return [
        `What statutory filings are due next for ${country}?`,
        '',
        'Steps:',
        `1. Call next_deadlines with country="${country}"${within ? ` and withinDays=${within}` : ''}.`,
        '2. Present each upcoming filing with its form, due date and days remaining, soonest first.',
        '3. Add the response’s disclaimer: dates rotate annually and some vary by state/turnover — confirm against each entry’s source URL.',
      ].join('\n');
    },
  },
  {
    name: 'integration_and_payments_check',
    description: 'Check whether HelloBooks supports a specific app/bank and the local payment rails.',
    argsSchema: {
      name: z.string().describe('The app, bank or service to check, e.g. Stripe, HDFC, Shopify.'),
      country: z.string().optional().describe('ISO country code for local payment methods.'),
    },
    build: (a) => {
      const name = a.name?.trim() || 'the service';
      const country = a.country?.trim();
      return [
        `Does HelloBooks work with ${name}${country ? `, and how can customers pay in ${country}?` : '?'}`,
        '',
        'Steps:',
        `1. Call check_integration with name="${name}" for a definitive supported yes/no and status.`,
        country ? `2. Call local_payment_methods with country="${country}" for the supported rails (UPI, BACS, ACH, PayID, …).` : '2. If a country is given, call local_payment_methods for the supported rails.',
        '3. If there is no direct integration match, offer the closest suggestions from the tool rather than guessing.',
      ].join('\n');
    },
  },
];

/** Register every curated prompt on the MCP server. */
export function registerPrompts(server: McpServer): void {
  for (const p of PROMPTS) {
    server.prompt(p.name, p.description, p.argsSchema, (args) => ({
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: p.build(args as Record<string, string | undefined>) },
        },
      ],
    }));
  }
}
