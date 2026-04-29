# Changelog

All notable changes to `@visualsentinel/mcp-server`. Format follows [Keep a Changelog](https://keepachangelog.com/) and the package uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-04-29

Initial public release.

### Added

* 16 tools wrapping the public Visual Sentinel REST API (5 public, 11 authenticated).
* stdio transport (MCP protocol version `2025-06-18`).
* `VS_API_KEY` (or `VISUALSENTINEL_API_KEY`) for authenticated tools; `VS_API_BASE` override for local development.
* TypeScript build via tsup, ESM-only, Node 18+.
* README with installation snippets for Claude Desktop, Claude Code, Cline, Continue.
