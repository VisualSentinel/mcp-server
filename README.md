# Visual Sentinel MCP Server

[![MCP Badge](https://lobehub.com/badge/mcp/visualsentinel-mcp-server)](https://lobehub.com/mcp/visualsentinel-mcp-server)

Model Context Protocol server for [Visual Sentinel](https://visualsentinel.com). Visual Sentinel catches pages that look broken even when the site is up. It monitors six layers: uptime, performance, SSL, DNS, visual regression, and content change.

Connect Claude Desktop, Claude Code, Cursor, Cline, Continue, or any MCP-compatible client so an AI assistant can run DNS, SSL and speed checks on any site with no account. With a Visual Sentinel account and an API key (Business and Agency plans) it can also list and create monitors, fetch incident history, and acknowledge alerts on your behalf.

* **Homepage and docs:** https://visualsentinel.com/mcp
* **npm:** `@visualsentinel/mcp-server`
* **OpenAPI spec:** https://github.com/VisualSentinel/openapi
* **API key (Business and Agency plans):** https://visualsentinel.com/settings/api-keys
* **Hosted API reference:** https://visualsentinel.com/docs

## What you get

17 tools spanning the public Visual Sentinel API:

**Public tools (no API key required)**

| Tool | Endpoint | Purpose |
|---|---|---|
| `vs_health` | `GET /api/health` | Service health probe |
| `vs_dns_check` | `GET /api/tools/dns-check` | Resolve A / AAAA / MX / NS / TXT / CNAME / SOA records |
| `vs_ssl_check` | `GET /api/tools/ssl-check` | Inspect TLS certificate (issuer, validity, SAN list, chain) |
| `vs_speed_test` | `GET /api/tools/speed-test` | One-shot performance check (TTFB, total load, transfer size) |
| `vs_website_check` | `GET /api/tools/website-check` | Quick HTTP health check |

**Authenticated tools (require `VS_API_KEY`)**

| Tool | Endpoint | Purpose |
|---|---|---|
| `vs_monitors_list` | `GET /api/monitors` | List monitors with optional status / type filters |
| `vs_monitors_get` | `GET /api/monitors/{id}` | Fetch a single monitor with current status |
| `vs_monitors_create` | `POST /api/monitors` | Create a new monitor |
| `vs_monitors_check_now` | `POST /api/monitors/{id}/check` | Trigger an immediate check |
| `vs_monitors_uptime` | `GET /api/monitors/{id}/uptime` | Uptime percentage for a preset window, a custom date range, or the full history |
| `vs_monitors_metrics_bulk` | `POST /api/monitors/metrics` | Uptime or response-time metrics for up to 100 monitors in one call |
| `vs_incidents_list` | `GET /api/incidents` | List incidents, filterable by status or monitor |
| `vs_incidents_get` | `GET /api/incidents/{id}` | Fetch an incident with full check history |
| `vs_alerts_list` | `GET /api/alerts` | List alerts by status |
| `vs_alerts_acknowledge` | `POST /api/alerts/{id}/acknowledge` | Acknowledge an alert |
| `vs_status_pages_list` | `GET /api/status-pages` | List your public status pages |
| `vs_servers_list` | `GET /api/servers` | List registered origin servers |

## Prompts and resources

Besides the 17 tools, the server offers four ready-made prompts and three read-only resources. None of them need an API key except the last prompt.

| Prompt | What it does |
|---|---|
| `check_website_health` | Runs the website, SSL, DNS and speed checks on one site and summarises what needs attention. |
| `investigate_broken_site` | Works through DNS, certificate, response and speed to find the layer at fault; reads incidents and alerts too when an API key is set. |
| `pre_launch_checklist` | Pass, Warn or Fail checklist for a new or migrated domain. |
| `triage_open_incidents` | Ranks open incidents and unacknowledged alerts (needs an API key). |

| Resource | Contents |
|---|---|
| `visualsentinel://plans` | Plan limits, and which plans include API keys and the account tools. |
| `visualsentinel://help` | Setup without an account, adding an API key, links. |
| `visualsentinel://tools` | Every tool, whether it needs a key, and whether it changes data. |

Without an API key the server still starts and lists everything. The five public tools work; each account tool returns a clear message that it needs an API key (Business and Agency plans) instead of failing.

## Installation

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "visualsentinel": {
      "command": "npx",
      "args": ["-y", "@visualsentinel/mcp-server"],
      "env": {
        "VS_API_KEY": "vs_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

Restart Claude Desktop. The 17 tools appear under the tools menu.

### Claude Code (CLI)

```bash
claude mcp add visualsentinel \
  -- npx -y @visualsentinel/mcp-server
```

Then export `VS_API_KEY` in the shell where Claude Code runs.

### Cursor and Grok Bot

This repository is also an installable plugin: `.cursor-plugin/plugin.json` and `mcp.json` for the Cursor Marketplace, and `.claude-plugin/plugin.json` and `.mcp.json` for Grok and Claude Code (`grok plugin install VisualSentinel/mcp-server`). Or add the server by hand to `~/.cursor/mcp.json`:

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

### Docker

```bash
docker build -t visualsentinel-mcp-server .
docker run -i --rm -e VS_API_KEY visualsentinel-mcp-server
```

The server also ships as a Gemini CLI extension (`gemini-extension.json`).

### Cline (VS Code extension)

In Cline's MCP settings, add:

```json
{
  "visualsentinel": {
    "command": "npx",
    "args": ["-y", "@visualsentinel/mcp-server"],
    "env": { "VS_API_KEY": "vs_live_..." }
  }
}
```

### Continue

In `~/.continue/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "visualsentinel",
      "command": "npx",
      "args": ["-y", "@visualsentinel/mcp-server"],
      "env": { "VS_API_KEY": "vs_live_..." }
    }
  ]
}
```

### Generic MCP client (stdio)

```bash
VS_API_KEY=vs_live_xxx npx -y @visualsentinel/mcp-server
```

The server speaks JSON-RPC over stdio per the MCP specification (`2025-06-18`).

## Configuration

Two environment variables, both optional except in the noted cases:

| Variable | Default | Purpose |
|---|---|---|
| `VS_API_KEY` | (none) | Required for the 12 authenticated tools (API keys are available on the Business and Agency plans). Public tools work without it. Generate at https://visualsentinel.com/settings/api-keys. |
| `VS_API_BASE` | `https://visualsentinel.com` | Override only for testing against a local development instance. |

If a tool that needs auth is called without `VS_API_KEY`, the server returns a clear error rather than silently failing.

`VISUALSENTINEL_API_KEY` is accepted as an alias for `VS_API_KEY` for clients that prefer the longer name.

## Usage examples

After installation, ask the AI assistant things like:

* "What's the SSL certificate situation on visualsentinel.com? When does it expire?"
* "List my Visual Sentinel monitors that are currently down."
* "Add a new HTTPS monitor for https://shop.example.com checking every minute."
* "Show me incidents from the last 24 hours and acknowledge the ones for monitor-id `clm123`."
* "What's the uptime percentage for my landing page over the last 30 days?"
* "Run a speed test on https://example.com/checkout."

The assistant chooses the appropriate tool, fills in arguments from the conversation, and shows the JSON response.

## Security notes

* Your API key never leaves the machine running this MCP server. Requests go directly to `https://visualsentinel.com` over HTTPS.
* Public tools (`vs_health`, `vs_dns_check`, `vs_ssl_check`, `vs_speed_test`, `vs_website_check`) work without an API key, but their results are visible to anyone who can read your conversation logs. Treat them like any other shell-out.
* Revoke a leaked API key immediately at https://visualsentinel.com/settings/api-keys. Revocation takes effect within seconds.
* Tools that mutate state (`vs_monitors_create`, `vs_monitors_check_now`, `vs_alerts_acknowledge`) inherit your API key's role-based permissions. A read-only key cannot create monitors.

## Development

```bash
git clone https://github.com/VisualSentinel/mcp-server.git
cd mcp-server
npm install
npm run build      # tsup, output to dist/
npm run lint       # tsc --noEmit
npm run dev        # tsup --watch
```

To smoke-test locally against the production API:

```bash
VS_API_KEY=vs_live_... node dist/index.js
```

The server speaks JSON-RPC on stdin / stdout. Pipe in a `tools/list` request to see the registered tools.

## Versioning

Semantic versioning. Breaking changes to tool names or required arguments get a major bump. Adding new tools or new optional arguments is a minor or patch.

The server's tool surface tracks the public Visual Sentinel API spec at https://github.com/VisualSentinel/openapi. When the upstream API gains a useful endpoint, this repository typically catches up within a release.

## License

MIT. See [`LICENSE`](./LICENSE).

The Visual Sentinel API service itself is governed by https://visualsentinel.com/terms.
