# Cross-repo freshness — MCP catalog change → marketing-site cache bust

This document closes the loop documented in PR #23 (this repo) + [Web-Fire-hellobooks.ai PR #395](https://github.com/Meru-Technosoft-Private-Limited/Web-Fire-hellobooks.ai/pull/395) by pinging `hellobooks.ai/api/revalidate` whenever the public MCP catalog changes, so the marketing-origin `/api/feed/agents.json` mirror picks up the new catalog within seconds instead of waiting for its 15-minute ISR window or the 24-hour sitemap regeneration.

## Pipeline

```
MCP catalog change
  -> Jenkins deploy of agents.hellobooks.ai          (existing, separate)
  -> GitHub Action below pings /api/revalidate
  -> /api/feed/agents.json ISR cache busts            (~0s instead of 15m)
  -> /sitemap.xml lastmod bumps on next regen
  -> AI crawlers re-fetch on next visit               (minutes, not 24h)
```

The Action is a **notify-only side-channel**. It does NOT deploy anything; production deploy of `agents.hellobooks.ai` itself is Jenkins per the org-wide "Jenkins is the build system" convention.

## Setup (one-time, ~2 minutes)

1. **Add the repo secret.** GitHub → Settings → Secrets and variables → Actions → New repository secret:
   - Name: `HELLOBOOKS_REVALIDATE_SECRET`
   - Value: same string as `REVALIDATE_SECRET` on the hellobooks.ai deployment (the Payload CMS hooks already use this secret).

2. **Install the workflow.** Copy `docs/notify-marketing-revalidate.yml.example` to `.github/workflows/notify-marketing-revalidate.yml` and commit. (It lives in `docs/` rather than the live workflows path because the OAuth token Claude Code used to open this PR doesn't have `workflow` scope — see GitHub's [token-scope rule](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps) for OAuth apps writing workflow files. A human commit lifts that restriction.)

   ```bash
   mkdir -p .github/workflows
   git mv docs/notify-marketing-revalidate.yml.example .github/workflows/notify-marketing-revalidate.yml
   git commit -m "ci: install marketing-revalidate notify workflow"
   git push
   ```

3. **Verify.** After the first push to `main` that touches `src/data/**` or any other watched path, the workflow runs and the `Summary` step prints "Marketing-site revalidate pinged". A manual fire via Actions → notify-marketing-revalidate → Run workflow also works.

## What it watches

Triggers on push to `main` affecting any file that flows into the public catalog:

- `src/data/**`
- `src/discovery.ts`
- `src/server.ts`
- `src/resources/**`
- `src/tools/**`
- `server.json`
- `package.json`

Also exposed via `workflow_dispatch` for manual fires (e.g. after rotating the secret).

## Failure mode

If `HELLOBOOKS_REVALIDATE_SECRET` is not configured, the workflow logs a warning and exits 0 — safe to install before the secret lands. If the marketing-site responds non-200 it fails the run, surfacing the issue in the Actions tab without ever blocking a deploy.

## Receiving handler

[`Web-Fire-hellobooks.ai/src/app/api/revalidate/route.ts`](https://github.com/Meru-Technosoft-Private-Limited/Web-Fire-hellobooks.ai/blob/main/src/app/api/revalidate/route.ts) GET form already accepts `?path=<safe-path>` with `x-revalidate-secret` — no changes needed on the marketing side. The handler is rate-limited (10 GET / minute / token), HMAC-aware for higher-trust callers, and validates that the path starts with `/` and has no traversal or scheme.
