# Drop-in MCP client configs

Ready-to-use config files for connecting MCP-aware clients to the HelloBooks
public MCP server. **One URL, no sign-in, read-only public data:**

```
https://agents.hellobooks.ai/mcp
```

Transport: Streamable HTTP. No API key. Copy the file for your client to the
path shown below (key names and paths occasionally change between client
versions — see your client's MCP docs if a field is rejected).

| Client | File here | Copy it to |
| --- | --- | --- |
| VS Code (GitHub Copilot agent mode) | [`.vscode-mcp.json`](.vscode-mcp.json) | `.vscode/mcp.json` in your workspace |
| Cursor | [`cursor.mcp.json`](cursor.mcp.json) | `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global) |
| Windsurf | [`windsurf.mcp_config.json`](windsurf.mcp_config.json) | `~/.codeium/windsurf/mcp_config.json` |
| Cline / Roo (VS Code) | [`cline_mcp_settings.json`](cline_mcp_settings.json) | the extension's `cline_mcp_settings.json` |
| Zed | [`zed-settings.json`](zed-settings.json) | merge `context_servers` into Zed `settings.json` |
| Claude Desktop | [`claude-desktop-config.json`](claude-desktop-config.json) | `claude_desktop_config.json` (uses `mcp-remote` to bridge the HTTP server to stdio) |

## Claude Code (CLI)

No file needed — one command:

```bash
claude mcp add --transport http hellobooks https://agents.hellobooks.ai/mcp
```

## No-code / workflow tools (n8n, Make, Zapier)

Use each platform's generic **MCP Client** node and point it at the same URL with
the **HTTP / Streamable** transport and **no authentication**. There is no config
file to copy — enter `https://agents.hellobooks.ai/mcp` in the node's Server URL
field.

## Verify it works

Once connected, the client should list ~40 read-only tools (`search`, `fetch`,
`list_plans`, `recommend_plan`, `check_integration`, `compliance_deadlines`, …).
If the client shows an error, confirm it sends
`Accept: application/json, text/event-stream` — the server answers `406` without
it.
