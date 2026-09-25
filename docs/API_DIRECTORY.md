# APIs and accountant directory

The agents site is the entry point for HelloBooks API discovery and published
accountant profiles. This change is in development.

## Delivery contract

- Browse and search public JSON APIs, MCP tools, and the developer API reference.
- Link to documentation, authentication instructions, and request examples.
- Browse every published accountant, including firms not accepting new clients.
- Return all published profile fields, with filters and explicit pagination.
- Use the marketing directory feed as the source; report unavailable or stale
  data honestly, and preserve an authoritative empty result.
- Keep accounting API execution behind its existing OAuth and tenant controls.

The marketing feed currently uses an empty build snapshot while the live
directory has published firms. The companion website repair switches that feed
to the live published-directory loader and follows every source page.
