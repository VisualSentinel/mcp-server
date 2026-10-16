# Installing the Visual Sentinel MCP server (instructions for AI agents)

Visual Sentinel is a website monitoring service. This MCP server runs locally over stdio and needs Node.js 18 or newer.

1. Add this server to the MCP settings file of the client (for Cline, the `cline_mcp_settings.json` file):

```json
{
  "mcpServers": {
    "visualsentinel": {
      "command": "npx",
      "args": ["-y", "@visualsentinel/mcp-server"]
    }
  }
}
```

2. Five tools work immediately with no account: `vs_health`, `vs_dns_check`, `vs_ssl_check`, `vs_speed_test`, `vs_website_check`.

3. Twelve account tools (monitors, uptime, incidents, alerts, status pages, servers) need a Visual Sentinel API key. API keys are available on the Business and Agency plans. Ask the user for the key, then add it to the server entry:

```json
"env": { "VS_API_KEY": "<the user's API key>" }
```

Never print the key back or store it anywhere except the client's MCP settings. The user creates keys at https://visualsentinel.com/settings/api-keys.

4. Verify the install by calling `vs_dns_check` with `{ "domain": "example.com" }`.

Docs: https://visualsentinel.com/mcp
