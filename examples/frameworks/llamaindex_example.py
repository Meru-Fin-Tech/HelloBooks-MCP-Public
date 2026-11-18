"""
LlamaIndex -> HelloBooks public MCP server.

WARNING: This script calls a LIVE public endpoint over the network
(https://agents.hellobooks.ai/mcp). It is read-only and needs no API key,
no sign-in, and no credentials -- the server only exposes HelloBooks
product knowledge (plans, integrations, country support, compliance).

Install:  pip install llama-index-tools-mcp
Run:      python llamaindex_example.py
"""

import asyncio

from llama_index.tools.mcp import BasicMCPClient, McpToolSpec

# One URL, Streamable HTTP, no auth. BasicMCPClient uses streamable-http
# automatically for http(s) URLs.
ENDPOINT = "https://agents.hellobooks.ai/mcp"


async def main() -> None:
    client = BasicMCPClient(ENDPOINT)

    # Wrap the server as LlamaIndex tools -- hand `tools` to any LlamaIndex
    # agent (FunctionAgent / ReActAgent). Listing them needs no LLM key.
    tools = await McpToolSpec(client=client).to_tool_list_async()
    print("Tools exposed:", [t.metadata.name for t in tools])

    # Call one real tool directly through the MCP client and print the result.
    result = await client.call_tool("list_plans", {"country": "US"})
    print("\nlist_plans(US) ->")
    print(result.content[0].text[:800])


if __name__ == "__main__":
    asyncio.run(main())
