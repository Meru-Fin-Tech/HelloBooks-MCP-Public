"""Quickstart: minimal Python client for the HelloBooks public MCP server.

    pip install mcp
    python examples/quickstart/python-client.py

No auth, no config. The official `mcp` package's streamable-http client handles
the session handshake, the required `Accept: application/json, text/event-stream`
header, and SSE parsing for you.

Requires Python 3.10+.
"""

import asyncio
import json

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

MCP_URL = "https://agents.hellobooks.ai/mcp"


async def main() -> None:
    # streamablehttp_client yields (read, write, get_session_id). The session
    # id is tracked for you; you rarely need the third value.
    async with streamablehttp_client(MCP_URL) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            print(f"Connected to {MCP_URL}\n")

            # 1. Discover the tools.
            tools = (await session.list_tools()).tools
            print(f"{len(tools)} tools available:")
            for tool in tools:
                print(f"  - {tool.name}")

            # 2. Call one. Tool output is a content list; the JSON payload is the
            #    text of the first content block.
            result = await session.call_tool("list_plans", {"country": "IN"})
            plans = json.loads(result.content[0].text)

            print(f"\nlist_plans ({plans.get('country', 'default')}):")
            for plan in plans.get("plans", []):
                price = plan.get("monthly", plan.get("price", "—"))
                print(f"  {plan['name']}: {price}")


if __name__ == "__main__":
    asyncio.run(main())
