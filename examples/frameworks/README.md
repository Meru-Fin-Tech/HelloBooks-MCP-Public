# Framework integration examples

Minimal, runnable scripts that connect popular AI-agent frameworks to the
**HelloBooks public MCP server** and call a real tool.

- **Endpoint:** `https://agents.hellobooks.ai/mcp`
- **Transport:** Streamable HTTP
- **Auth:** **none** — the server is public and read-only, so **no API key is
  needed** for any of these scripts.

Each script connects to the endpoint, lists the exposed tools, then calls one
real tool (`list_plans`) and prints the result. Every script drives the tools
directly, so you don't need an LLM provider key just to try it — wire the same
`tools` into an agent when you want the model to call them.

> ⚠️ These scripts hit a **live public endpoint** over the network.

| Framework | Install | Run |
|-----------|---------|-----|
| **LlamaIndex** | `pip install llama-index-tools-mcp` | `python llamaindex_example.py` |
| **CrewAI** | `pip install 'crewai-tools[mcp]'` | `python crewai_example.py` |
| **AutoGen** | `pip install 'autogen-ext[mcp]'` | `python autogen_example.py` |
| **LangChain / LangGraph** | `pip install langchain-mcp-adapters mcp` | `python langchain_example.py` |

## Which tool to call

`list_plans` (used above) and `recommend_plan` are good first calls — both take
an optional `country` ISO code (e.g. `{"country": "US"}`) and need no other
input. Call any script's `list_tools` output to see the full catalog (plans,
integrations, country support, statutory deadlines, competitor positioning).

See the repo [README](../../README.md) for the one-line config snippets used by
editors and other MCP clients.
