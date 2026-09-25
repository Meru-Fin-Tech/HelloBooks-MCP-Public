# APIs and accountant directory

The agents site is the entry point for HelloBooks API discovery and published
accountant profiles.

| Surface | URL |
| --- | --- |
| Searchable API catalog | `/apis` |
| API catalog JSON | `/api/catalog.json` |
| Complete accounting OpenAPI reference | `/api/developer-reference.json` |
| Accountant directory | `/accountants` |
| All accountant profiles | `/api/accountants.json` |
| One full profile | `/api/accountants/{slug}.json` |

Both list APIs accept `page` (default 1) and `pageSize` (maximum 100). Follow
`nextPage` until it is `null`; `total` counts every matching record. Accountants
accept `query`, `country`, `city`, `specialty`, and `acceptingClients`. Omit
availability to include all published firms. API entries accept `query`, `kind`
(`public`, `mcp`, `accounting`), and `id`; `id` returns the complete contract.

MCP tools: `list_accountants`, `get_accountant`, and `list_api_catalog`. Connect
the client to `https://agents.hellobooks.ai/mcp` before calling them.

## Sources and freshness

Accountants come from `https://hellobooks.ai/api/feed/accountants.json` with a
five-minute cache and a ten-second timeout. `status` is `live`, `stale`, or
`unavailable`. An unavailable cold source returns HTTP 503; an outage with cached
profiles returns explicitly stale data. A successful empty source replaces old
profiles. Only published public fields are returned. The operator can set
`HELLOBOOKS_MCP_ACCOUNTANTS_FEED_URL` for an isolated test source.

Accounting definitions are a versioned snapshot of the generated Auth-V3 public
OpenAPI, including operations outside the portal sidebar. The catalog reports
the source commit and import timestamp. No credentials or customer records are
included. Undefined field contracts remain marked unpublished; the reference is
not a claim that every operation has been exercised in a deployed environment.

Refresh from the canonical generated specification and the published portal
catalog, after verifying both belong to the same source revision:

```sh
node scripts/sync-developer-reference.mjs --spec path/to/public-api.openapi.json --portal-catalog path/to/published-api-catalog.json --source-commit COMMIT_SHA
```

The importer checks every published method/path/summary against the specification
before writing either snapshot. The test suite checks exhaustive operation and
MCP-tool coverage. Public product feeds are generated from the existing registry.

## Delivery contract

- Browse and search public JSON APIs, MCP tools, and the developer API reference.
- Link to documentation, authentication instructions, and request examples.
- Browse every published accountant, including firms not accepting new clients.
- Return all published profile fields, with filters and explicit pagination.
- Use the marketing directory feed as the source; report unavailable or stale
  data honestly, and preserve an authoritative empty result.
- Keep accounting API execution behind its existing OAuth and tenant controls.

The companion website PR switches the marketing feed from its build snapshot to
the live published-directory loader and follows every source page. Deploy that
repair first to populate the agents directory from current firms.
