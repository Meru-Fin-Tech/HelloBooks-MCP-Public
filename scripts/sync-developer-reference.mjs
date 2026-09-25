import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const arg = name => args[args.indexOf(name) + 1];
for (const name of ['--spec', '--portal-catalog', '--source-commit']) {
  if (!args.includes(name)) throw new Error(`Required: ${name}`);
}
const raw = fs.readFileSync(arg('--spec'), 'utf8');
const spec = JSON.parse(raw);
const portal = JSON.parse(fs.readFileSync(arg('--portal-catalog'), 'utf8'));
const methods = new Set(['get','post','put','patch','delete','head','options']);
if (!spec.openapi?.startsWith('3.') || !spec.paths || !Array.isArray(portal.domains)) throw new Error('Invalid reference input');
const docs = {};
for (const domain of portal.domains) {
  for (const resource of domain.resources) {
    resource.operations.forEach((operation, index) => {
      const official = spec.paths[operation.path]?.[operation.method.toLowerCase()];
      if (!official || official.summary !== operation.summary) throw new Error(`Portal/spec mismatch: ${operation.method} ${operation.path}`);
      docs[`${operation.method} ${operation.path}`] = `https://developer.hellobooks.ai/docs/reference-${encodeURIComponent(domain.key)}?resource=${encodeURIComponent(resource.seg)}&op=${index}`;
    });
  }
}
// Resolve only declared server defaults; keep the published contracts verbatim.
spec.servers = spec.servers.map(server => ({ ...server,
  url: server.url.replace(/\{([^}]+)\}/g, (match, name) => server.variables?.[name]?.default ?? match),
}));
const operations = Object.values(spec.paths).reduce((n, item) => n + Object.keys(item).filter(key => methods.has(key)).length, 0);
const metadata = {
  source: 'HelloBooks-Backend-Auth-V3/openapi/public-api.openapi.json',
  sourceCommit: arg('--source-commit'), sourceSha256: crypto.createHash('sha256').update(raw).digest('hex'),
  importedAt: new Date().toISOString(), operations, publishedPortalOperations: Object.keys(docs).length,
  contractSchemaSha: portal._contractSchemaSha, documentation: 'https://developer.hellobooks.ai/docs/overview', docs,
};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.writeFileSync(path.join(root, 'src/data/developerApi.json'), JSON.stringify(spec) + '\n');
fs.writeFileSync(path.join(root, 'src/data/developerApiMeta.json'), JSON.stringify(metadata) + '\n');
console.log(JSON.stringify({ operations, publishedPortalOperations: Object.keys(docs).length, sourceCommit: metadata.sourceCommit }));
