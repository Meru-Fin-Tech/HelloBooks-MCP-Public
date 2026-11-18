"""
CrewAI -> HelloBooks public MCP server.

WARNING: This script calls a LIVE public endpoint over the network
(https://agents.hellobooks.ai/mcp). It is read-only and needs no API key,
no sign-in, and no credentials -- the server only exposes HelloBooks
product knowledge (plans, integrations, country support, compliance).

Install:  pip install 'crewai-tools[mcp]'
Run:      python crewai_example.py
"""

from crewai_tools import MCPServerAdapter

# One URL, Streamable HTTP, no auth.
SERVER_PARAMS = {
    "url": "https://agents.hellobooks.ai/mcp",
    "transport": "streamable-http",
}


def main() -> None:
    # MCPServerAdapter opens the connection and yields CrewAI BaseTool objects
    # you can give straight to a crewai Agent(tools=tools). The context manager
    # keeps the MCP session alive while you use them.
    with MCPServerAdapter(SERVER_PARAMS) as tools:
        print("Tools exposed:", [tool.name for tool in tools])

        # Pick one real tool and run it directly (no LLM / crew needed).
        list_plans = next(tool for tool in tools if tool.name == "list_plans")
        print("\nlist_plans(US) ->")
        print(str(list_plans.run(country="US"))[:800])


if __name__ == "__main__":
    main()
