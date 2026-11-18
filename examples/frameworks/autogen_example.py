"""
AutoGen -> HelloBooks public MCP server.

WARNING: This script calls a LIVE public endpoint over the network
(https://agents.hellobooks.ai/mcp). It is read-only and needs no API key,
no sign-in, and no credentials -- the server only exposes HelloBooks
product knowledge (plans, integrations, country support, compliance).

Install:  pip install 'autogen-ext[mcp]'
Run:      python autogen_example.py
"""

import asyncio

from autogen_ext.tools.mcp import McpWorkbench, StreamableHttpServerParams

# One URL, Streamable HTTP, no auth.
PARAMS = StreamableHttpServerParams(url="https://agents.hellobooks.ai/mcp")


async def main() -> None:
    # A workbench is the MCP connection; hand it to an AssistantAgent via
    # workbench=... to let it call these tools. Here we drive it directly so
    # no model client / API key is required.
    async with McpWorkbench(PARAMS) as workbench:
        tools = await workbench.list_tools()
        print("Tools exposed:", [tool["name"] for tool in tools])

        # Call one real tool and print the result.
        result = await workbench.call_tool("list_plans", {"country": "US"})
        print("\nlist_plans(US) ->")
        print(result.to_text()[:800])


if __name__ == "__main__":
    asyncio.run(main())
