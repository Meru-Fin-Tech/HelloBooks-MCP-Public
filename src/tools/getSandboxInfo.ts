/**
 * `get_sandbox_info` — how to try HelloBooks from an AI agent or integration.
 *
 * Two distinct "try it" paths, which agents and developers conflate:
 *   1. This PUBLIC MCP (agents.hellobooks.ai/mcp) — no auth, read-only product
 *      knowledge. Works today in Claude, ChatGPT, Cursor, etc.
 *   2. The company API (developer.hellobooks.ai) — OAuth-scoped access to a
 *      company's own books, with an India sandbox for testing. Needs an app.
 *
 * This tool returns both, with the exact next steps, so an agent can answer
 * "how do I try/connect HelloBooks?" without guessing. Read-only, public data.
 */
import { z } from 'zod';

export const getSandboxInfoSchema = {
  surface: z
    .enum(['public-mcp', 'company-api', 'both'])
    .optional()
    .describe('Which path to return: the no-auth public MCP, the OAuth company API, or both (default).'),
};

export interface GetSandboxInfoArgs {
  surface?: 'public-mcp' | 'company-api' | 'both';
}

const PUBLIC_MCP = {
  name: 'HelloBooks Public MCP',
  endpoint: 'https://agents.hellobooks.ai/mcp',
  transport: 'streamable-http',
  auth: 'none (read-only public data)',
  installClaudeCode: 'claude mcp add --transport http hellobooks https://agents.hellobooks.ai/mcp',
  addByUrl: 'Add the endpoint as a custom connector in Claude or ChatGPT — authentication: No sign in / No authentication.',
  note: 'Works today with no account. Exposes product knowledge (pricing, integrations, country support, compliance, features) — never customer data.',
};

const COMPANY_API = {
  name: 'HelloBooks Company API',
  developerPortal: 'https://developer.hellobooks.ai/',
  docs: 'https://developer.hellobooks.ai/docs/overview',
  apiCatalog: 'https://agents.hellobooks.ai/apis',
  auth: 'company-scoped OAuth',
  sandbox: 'An India sandbox is available for testing company API calls before going live.',
  authenticatedMcp: 'For an agent to read a specific customer’s books, use the authenticated MCP at mcp.hellobooks.ai (the customer must be signed in).',
  oauthSteps: [
    'Register an app in the Developer Portal.',
    'Connect a company via OAuth to obtain company-scoped access.',
    'Test against the India sandbox before pointing at live data.',
  ],
};

export function getSandboxInfo(args: GetSandboxInfoArgs) {
  const surface = args.surface ?? 'both';
  return {
    surface,
    publicMcp: surface === 'company-api' ? undefined : PUBLIC_MCP,
    companyApi: surface === 'public-mcp' ? undefined : COMPANY_API,
    note:
      'Start with the public MCP (no auth) to answer product questions. Use the company API (OAuth + India sandbox) only when an integration needs a specific company’s books.',
  };
}
