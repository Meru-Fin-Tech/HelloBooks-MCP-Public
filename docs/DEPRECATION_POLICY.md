# Versioning & deprecation policy

Agents and integrations depend on the tool/resource surface being stable. This
policy says what will and won't change without notice.

## Versioning

- The server follows **SemVer** (`package.json` = `server.json` = `SERVER_VERSION`,
  enforced by `test/version.test.ts`).
- **Patch** (x.y.Z): data refreshes, copy, bug fixes. No surface change.
- **Minor** (x.Y.0): new tools, prompts, resources, or endpoints — additive only.
- **Major** (X.0.0): a breaking change to an existing tool's name, arguments, or
  response shape, or removal of a tool/resource.

## What is stable

- **Tool names and their input arguments** do not change or disappear within a
  major version. New optional arguments may be added (non-breaking).
- **The OpenAI `search`/`fetch` contract** (`{id,title,url}` / `{id,title,text,url,metadata}`)
  is frozen for the life of the server.
- **Resource URIs** (`hellobooks://…`) are stable within a major version.
- **The MCP endpoint** (`agents.hellobooks.ai/mcp`) and transport are stable.

## What may change without a major bump

- The **set of catalog entries** (which plans, integrations, countries, deadlines,
  articles exist) — this is data, and it moves with the product.
- **Response field *values*** (prices, dates, counts) — always current, by design.
- **Additive** fields on a response.

## Deprecation process

1. A tool/resource marked for removal gets a `deprecated: true` flag and a
   `deprecationNote` in its response, plus a changelog entry.
2. It keeps working for at least **one minor release and 90 days**, whichever is
   longer.
3. Removal lands only in a **major** version, announced in the changelog, the RSS
   feed (`/feed.xml`), and `/llms.txt` recent changes.

## How to track changes

- `hellobooks://changelog` resource, `/changelog.json`, and `/feed.xml` (RSS).
- Watch the GitHub repo for releases.
