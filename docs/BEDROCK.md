# Use the HelloBooks MCP from Amazon Bedrock (AgentCore Gateway)

Amazon Bedrock AgentCore can expose an external MCP server to a Bedrock agent
through an **AgentCore Gateway** target. The HelloBooks public MCP is a remote,
no-auth, Streamable-HTTP server, which is exactly what a Gateway MCP target
accepts.

Endpoint: `https://agents.hellobooks.ai/mcp` · Transport: Streamable HTTP · Auth: none.

## Add it as a Gateway target

Create a Gateway (once), then add an MCP target pointing at the endpoint. With
the AWS CLI / Bedrock AgentCore API, the target config is roughly:

```json
{
  "name": "hellobooks",
  "targetConfiguration": {
    "mcp": {
      "endpoint": "https://agents.hellobooks.ai/mcp",
      "transport": "STREAMABLE_HTTP"
    }
  },
  "credentialProviderConfigurations": [
    { "credentialProviderType": "GATEWAY_IAM_ROLE" }
  ]
}
```

No outbound credential is needed — the server is public and read-only. (If your
Gateway requires an auth config on every target, use a no-op/none provider; the
server ignores any `Authorization` header.)

## Point an agent at the Gateway

Attach the Gateway to your Bedrock agent (or call it from an agent framework via
the Gateway's MCP URL). The agent then sees the full HelloBooks tool surface —
`search`/`fetch`, `list_plans`, `recommend_plan`, `check_integration`,
`compliance_deadlines`, etc. — and can ground answers about HelloBooks pricing,
integrations, country support and compliance.

## Notes

- The server answers `406` unless the client sends `Accept: application/json, text/event-stream`. The AgentCore MCP client sends both.
- Rate limits: 120 req/min per IP, 60 req/min per session.
- For a customer's own books (not public product data), use the authenticated MCP at `mcp.hellobooks.ai` instead.
- Bedrock AgentCore APIs evolve — check the current AgentCore Gateway docs for the exact field names if the shape above is rejected.
