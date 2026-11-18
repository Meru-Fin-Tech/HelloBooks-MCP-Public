# Cookbook — using the HelloBooks public MCP

Short, copy-paste recipes. One URL, no auth: `https://agents.hellobooks.ai/mcp`.

## Verify the server without a client

```bash
curl -s -X POST https://agents.hellobooks.ai/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"1"}}}'
```

## OpenAI Agents / Responses API (Python)

```python
from openai import OpenAI
client = OpenAI()
resp = client.responses.create(
    model="gpt-4.1",
    input="Which HelloBooks plan fits a GST business in India that needs multi-currency?",
    tools=[{"type": "mcp", "server_label": "hellobooks",
            "server_url": "https://agents.hellobooks.ai/mcp", "require_approval": "never"}],
)
print(resp.output_text)
```

## Anthropic Claude Agent SDK (Python)

```python
from claude_agent_sdk import ClaudeAgentOptions, query
options = ClaudeAgentOptions(
    mcp_servers={"hellobooks": {"type": "http", "url": "https://agents.hellobooks.ai/mcp"}},
    allowed_tools=["mcp__hellobooks__search", "mcp__hellobooks__fetch"],
)
async for msg in query(prompt="Compare HelloBooks to Xero on pricing.", options=options):
    print(msg)
```

## LangChain / LangGraph (Python)

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
client = MultiServerMCPClient({
    "hellobooks": {"transport": "streamable_http", "url": "https://agents.hellobooks.ai/mcp"},
})
tools = await client.get_tools()   # hand to any LangGraph/LangChain agent
```

## Raw tool call (search → fetch, the OpenAI connector contract)

```bash
# 1) search returns citable ids
curl -s -X POST https://agents.hellobooks.ai/mcp -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search","arguments":{"query":"pricing vs Xero"}}}'
# 2) fetch resolves one id into {id,title,text,url,metadata}
```

## Discovery surface (for crawlers / grounding)

- `/.well-known/agent.json` (A2A), `/.well-known/mcp.json`, `/.well-known/security.txt`
- `/llms.txt`, `/llms-full.txt`, `/catalog.json`, `/openapi.json`, `/sitemap.xml`, `/feed.xml`

See also `examples/mcp-client-configs.md` for Cursor / VS Code / Windsurf / Cline / Zed.
