#!/usr/bin/env node
/**
 * STDIO entry point — for local install via `claude mcp add` with --transport stdio.
 * Most users will use the public HTTPS endpoint instead.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is fine for stdio servers — clients read protocol on stdout.
  process.stderr.write('hellobooks-mcp-public started on stdio\n');
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
