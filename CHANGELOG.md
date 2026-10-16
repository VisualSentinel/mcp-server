# Changelog

All notable changes to `@visualsentinel/mcp-server`. Format follows [Keep a Changelog](https://keepachangelog.com/) and the package uses [Semantic Versioning](https://semver.org/).

## [0.2.1] - 2026-10-16

### Fixed

* `vs_ssl_check` sent `?host=` but the API reads `?domain=`, so every call returned a 400. The tool now takes `domain` (`host` still works as an alias). The unsupported `port` input is removed.
* `vs_dns_check` sent `recordType`, which the API ignored. It now sends `type`, so the record-type filter works.
* The server now reports its real version in the MCP handshake instead of a fixed `0.1.0`.

### Added

* Every tool has a `title` and the MCP annotations `readOnlyHint`, `destructiveHint`, `idempotentHint` and `openWorldHint`, as AI directories require.
* `mcpName` (`io.github.VisualSentinel/mcp-server`) and `server.json` for the official MCP Registry.
* `.cursor-plugin/plugin.json`, `.claude-plugin/plugin.json`, `.mcp.json` and `mcp.json` for the Cursor Marketplace and Grok Bot, `llms-install.md` for Cline, a `Dockerfile` for the Docker MCP Catalog and Glama, and `gemini-extension.json`.

## [0.2.0] - 2026-06-04

### Added

* New tool `vs_monitors_metrics_bulk`: fetches uptime or response-time metrics for up to 100 monitors in a single API call. Accepts `monitorIds` (array), `metric` (`uptime` | `response-time`), and either a preset `window` or custom `from`+`to` ISO 8601 range. POSTs to `POST /api/monitors/metrics`.
* `vs_monitors_uptime`: added `from` and `to` input properties for custom date ranges. When both are supplied the handler sends them as query params instead of `period`, allowing arbitrary historical windows.
* `all` (boolean) input on `vs_monitors_uptime` and `vs_monitors_metrics_bulk`: requests the full available history from the earliest stored data. Precedence mirrors the API: `all` > `from`/`to` > `window`/`period`. This makes the documented full-history capability actually reachable through the tools.

### Changed

* `vs_monitors_uptime`: input schema now includes `from`, `to`, and expands `window` description to list `1h | 6h | 24h | 7d | 30d | 90d | 365d`. Handler now correctly maps `window` → `period` query param (previously `window` was sent as-is and silently ignored by the API). Default period remains `30d`.
* `tsup.config.ts`: added `src/tools.ts` and `src/api-client.ts` as explicit entry points so they emit separate dist files importable by tests without bundling index.ts.

### Fixed

* `vs_monitors_uptime` handler was sending `{ window: ... }` in the query string instead of `{ period: ... }`. The Visual Sentinel API only accepts `period`; the old behaviour silently fell back to the server default.

## [0.1.0] - 2026-04-29

Initial public release.

### Added

* 16 tools wrapping the public Visual Sentinel REST API (5 public, 11 authenticated).
* stdio transport (MCP protocol version `2025-06-18`).
* `VS_API_KEY` (or `VISUALSENTINEL_API_KEY`) for authenticated tools; `VS_API_BASE` override for local development.
* TypeScript build via tsup, ESM-only, Node 18+.
* README with installation snippets for Claude Desktop, Claude Code, Cline, Continue.
