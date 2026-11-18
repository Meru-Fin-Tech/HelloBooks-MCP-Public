"""
LangChain / LangGraph -> HelloBooks public MCP server.

WARNING: This script calls a LIVE public endpoint over the network
(https://agents.hellobooks.ai/mcp). It is read-only and needs no API key,
no sign-in, and no credentials -- the server only exposes HelloBooks
product knowledge (plans, integrations, country support, compliance).

Install:  pip install langchain-mcp-adapters mcp
Run:      python langchain_example.py
"""

import asyncio

from langchain_mcp_adapters.tools import load_mcp_tools
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

# One URL, Streamable HTTP, no auth.
ENDPOINT = "https://agents.hellobooks.ai/mcp"


async def main() -> None:
    # Open a Streamable HTTP session and adapt the server's tools into
    # LangChain StructuredTools -- hand `tools` to any LangGraph/LangChain
    # agent. Listing and invoking them needs no LLM key.
    async with streamablehttp_client(ENDPOINT) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await load_mcp_tools(session)
            print("Tools exposed:", [tool.name for tool in tools])

            # Invoke one real tool and print the result.
            by_name = {tool.name: tool for tool in tools}
            print("\nlist_plans(US) ->")
            print(str(await by_name["list_plans"].ainvoke({"country": "US"}))[:800])


if __name__ == "__main__":
    asyncio.run(main())
