import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getSandboxInfo } from '../src/tools/getSandboxInfo.js';

test('default returns both surfaces', () => {
  const r = getSandboxInfo({}) as any;
  assert.equal(r.surface, 'both');
  assert.ok(r.publicMcp?.endpoint?.includes('agents.hellobooks.ai'));
  assert.equal(r.publicMcp.auth, 'none (read-only public data)');
  assert.ok(r.companyApi?.developerPortal?.includes('developer.hellobooks.ai'));
  assert.ok(Array.isArray(r.companyApi.oauthSteps) && r.companyApi.oauthSteps.length > 0);
});

test('public-mcp scope omits the company API', () => {
  const r = getSandboxInfo({ surface: 'public-mcp' }) as any;
  assert.ok(r.publicMcp);
  assert.equal(r.companyApi, undefined);
});

test('company-api scope omits the public MCP', () => {
  const r = getSandboxInfo({ surface: 'company-api' }) as any;
  assert.equal(r.publicMcp, undefined);
  assert.ok(r.companyApi?.sandbox);
});
