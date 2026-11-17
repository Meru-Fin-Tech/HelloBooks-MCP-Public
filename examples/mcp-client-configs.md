# Ready-to-paste MCP client configs

One URL, no sign-in, for every MCP-aware client: `https://agents.hellobooks.ai/mcp`
(Streamable HTTP, read-only, public data). Copy the block for your client.

## VS Code (GitHub Copilot agent mode) — `.vscode/mcp.json`

```json
{
  "servers": {
    "hellobooks": {
      "type": "http",
      "url": "https://agents.hellobooks.ai/mcp"
    }
  }
}
```

## Cursor — `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "hellobooks": { "url": "https://agents.hellobooks.ai/mcp" }
  }
}
```

## Windsurf — `~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "hellobooks": {
      "serverUrl": "https://agents.hellobooks.ai/mcp"
    }
  }
}
```

## Cline / Roo (VS Code) — MCP settings `cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "hellobooks": {
      "type": "streamableHttp",
      "url": "https://agents.hellobooks.ai/mcp"
    }
  }
}
```

## Zed — `settings.json` → `context_servers`

```json
{
  "context_servers": {
    "hellobooks": {
      "source": "custom",
      "command": null,
      "url": "https://agents.hellobooks.ai/mcp"
    }
  }
}
```

## Claude Code (CLI)

```bash
claude mcp add --transport http hellobooks https://agents.hellobooks.ai/mcp
```

> Config key names vary by client version — check your client's MCP docs if a key
> is rejected. None of these need an API key.
