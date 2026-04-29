/**
 * Tool registry for the Visual Sentinel MCP server.
 *
 * Each tool wraps a single Visual Sentinel REST endpoint with a JSON Schema
 * input and a structured handler. Public-tool handlers (DNS check, SSL check,
 * speed test, website check, health) run without authentication; everything
 * else requires `VS_API_KEY`.
 */

import { ApiClient } from './api-client.js';

interface ToolInput {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInput;
  requiresAuth: boolean;
  handler: (args: Record<string, unknown>, client: ApiClient) => Promise<unknown>;
}

const STR = { type: 'string' as const };
const NUM = { type: 'number' as const };
const INT = { type: 'integer' as const };
const BOOL = { type: 'boolean' as const };

function pickString(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function pickNumber(args: Record<string, unknown>, key: string): number | undefined {
  const v = args[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function requireString(args: Record<string, unknown>, key: string): string {
  const v = pickString(args, key);
  if (!v) throw new Error(`Argument "${key}" (string) is required.`);
  return v;
}

export const TOOLS: ToolDefinition[] = [
  // -------------------------------------------------------------------------
  // Public tools (no auth)
  // -------------------------------------------------------------------------
  {
    name: 'vs_health',
    description:
      'Check whether Visual Sentinel itself is up. Returns the service health status. No authentication required.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    requiresAuth: false,
    handler: async (_args, client) => client.request('GET', '/api/health', { auth: false }),
  },

  {
    name: 'vs_dns_check',
    description:
      'Resolve DNS records (A, AAAA, MX, NS, TXT, CNAME) for a domain using Visual Sentinel\'s public DNS lookup tool. No authentication required.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { ...STR, description: 'Domain to resolve, e.g. example.com (without protocol).' },
        recordType: {
          ...STR,
          description: 'Optional: limit to one record type. One of: A, AAAA, MX, NS, TXT, CNAME, SOA. Default: all.',
        },
      },
      required: ['domain'],
      additionalProperties: false,
    },
    requiresAuth: false,
    handler: async (args, client) =>
      client.request('GET', '/api/tools/dns-check', {
        auth: false,
        query: {
          domain: requireString(args, 'domain'),
          recordType: pickString(args, 'recordType'),
        },
      }),
  },

  {
    name: 'vs_ssl_check',
    description:
      'Inspect a TLS/SSL certificate for a hostname: issuer, subject, validity dates, SAN list, key algorithm, and certificate chain. No authentication required.',
    inputSchema: {
      type: 'object',
      properties: {
        host: { ...STR, description: 'Hostname to inspect, e.g. example.com (without protocol).' },
        port: { ...INT, description: 'TCP port. Default 443.' },
      },
      required: ['host'],
      additionalProperties: false,
    },
    requiresAuth: false,
    handler: async (args, client) =>
      client.request('GET', '/api/tools/ssl-check', {
        auth: false,
        query: { host: requireString(args, 'host'), port: pickNumber(args, 'port') },
      }),
  },

  {
    name: 'vs_speed_test',
    description:
      'Run a one-shot performance check against a URL: TTFB, total load time, transfer size, status code, and redirect chain. No authentication required.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { ...STR, description: 'Full URL to test, including protocol (https://...).' },
      },
      required: ['url'],
      additionalProperties: false,
    },
    requiresAuth: false,
    handler: async (args, client) =>
      client.request('GET', '/api/tools/speed-test', {
        auth: false,
        query: { url: requireString(args, 'url') },
      }),
  },

  {
    name: 'vs_website_check',
    description:
      'Quick health check for a URL: HTTP status, response time, server header, content snippet, and basic SSL state. No authentication required.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { ...STR, description: 'Full URL to test, including protocol (https://...).' },
      },
      required: ['url'],
      additionalProperties: false,
    },
    requiresAuth: false,
    handler: async (args, client) =>
      client.request('GET', '/api/tools/website-check', {
        auth: false,
        query: { url: requireString(args, 'url') },
      }),
  },

  // -------------------------------------------------------------------------
  // Authenticated tools (require VS_API_KEY)
  // -------------------------------------------------------------------------
  {
    name: 'vs_monitors_list',
    description:
      'List monitors in the authenticated organization. Optional filters narrow by status, type, or paginate.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { ...STR, description: 'Filter: UP, DOWN, PAUSED, MAINTENANCE.' },
        type: {
          ...STR,
          description:
            'Filter by monitor type: HTTP, HTTPS, KEYWORD, PING, PORT, DNS, SSL, VISUAL, CONTENT, API, GRAPHQL, WEBSOCKET.',
        },
        page: { ...INT, description: 'Page number (default 1).' },
        limit: { ...INT, description: 'Items per page (default 50, max 200).' },
      },
      additionalProperties: false,
    },
    requiresAuth: true,
    handler: async (args, client) =>
      client.request('GET', '/api/monitors', {
        query: {
          status: pickString(args, 'status'),
          type: pickString(args, 'type'),
          page: pickNumber(args, 'page'),
          limit: pickNumber(args, 'limit'),
        },
      }),
  },

  {
    name: 'vs_monitors_get',
    description:
      'Fetch a single monitor by id, including its current status, last check, and configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { ...STR, description: 'Monitor id (cuid).' },
      },
      required: ['id'],
      additionalProperties: false,
    },
    requiresAuth: true,
    handler: async (args, client) =>
      client.request('GET', `/api/monitors/${encodeURIComponent(requireString(args, 'id'))}`),
  },

  {
    name: 'vs_monitors_create',
    description:
      'Create a new monitor. Provide at least name, url, and type. Returns the created monitor including its assigned id.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { ...STR, description: 'Display name for the monitor.' },
        url: { ...STR, description: 'Full URL to monitor (or hostname for PING/PORT/DNS/SSL).' },
        type: {
          ...STR,
          description:
            'Monitor type: HTTP, HTTPS, KEYWORD, PING, PORT, DNS, SSL, VISUAL, CONTENT, API, GRAPHQL, WEBSOCKET.',
        },
        interval: { ...INT, description: 'Check interval in seconds (60, 300, 600, 1800, 3600).' },
        timeout: { ...INT, description: 'Per-check timeout in seconds (default 30).' },
        method: { ...STR, description: 'HTTP method for HTTP/HTTPS monitors (default GET).' },
        keyword: { ...STR, description: 'Keyword to assert for KEYWORD monitors.' },
        port: { ...INT, description: 'TCP port for PORT monitors.' },
      },
      required: ['name', 'url', 'type'],
      additionalProperties: false,
    },
    requiresAuth: true,
    handler: async (args, client) =>
      client.request('POST', '/api/monitors', {
        body: {
          name: requireString(args, 'name'),
          url: requireString(args, 'url'),
          type: requireString(args, 'type'),
          interval: pickNumber(args, 'interval'),
          timeout: pickNumber(args, 'timeout'),
          method: pickString(args, 'method'),
          keyword: pickString(args, 'keyword'),
          port: pickNumber(args, 'port'),
        },
      }),
  },

  {
    name: 'vs_monitors_check_now',
    description:
      'Trigger an immediate check for a monitor (in addition to its scheduled cadence). Returns the freshly-collected check result.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { ...STR, description: 'Monitor id.' },
      },
      required: ['id'],
      additionalProperties: false,
    },
    requiresAuth: true,
    handler: async (args, client) =>
      client.request('POST', `/api/monitors/${encodeURIComponent(requireString(args, 'id'))}/check`),
  },

  {
    name: 'vs_monitors_uptime',
    description:
      'Fetch the uptime percentage and outage breakdown for a monitor over a window (default last 30 days).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { ...STR, description: 'Monitor id.' },
        window: {
          ...STR,
          description: 'Window: 24h, 7d, 30d, 90d, 365d. Default 30d.',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    requiresAuth: true,
    handler: async (args, client) =>
      client.request('GET', `/api/monitors/${encodeURIComponent(requireString(args, 'id'))}/uptime`, {
        query: { window: pickString(args, 'window') },
      }),
  },

  {
    name: 'vs_incidents_list',
    description:
      'List incidents for the authenticated organization. Filter by status (OPEN/RESOLVED), monitor id, or paginate.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { ...STR, description: 'OPEN or RESOLVED.' },
        monitorId: { ...STR, description: 'Filter to one monitor.' },
        page: { ...INT },
        limit: { ...INT, description: 'Default 50, max 200.' },
      },
      additionalProperties: false,
    },
    requiresAuth: true,
    handler: async (args, client) =>
      client.request('GET', '/api/incidents', {
        query: {
          status: pickString(args, 'status'),
          monitorId: pickString(args, 'monitorId'),
          page: pickNumber(args, 'page'),
          limit: pickNumber(args, 'limit'),
        },
      }),
  },

  {
    name: 'vs_incidents_get',
    description: 'Fetch a single incident with its full check history and root-cause hints.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { ...STR, description: 'Incident id.' },
      },
      required: ['id'],
      additionalProperties: false,
    },
    requiresAuth: true,
    handler: async (args, client) =>
      client.request('GET', `/api/incidents/${encodeURIComponent(requireString(args, 'id'))}`),
  },

  {
    name: 'vs_alerts_list',
    description:
      'List alerts for the authenticated organization. Filter by status (UNACKNOWLEDGED/ACKNOWLEDGED/RESOLVED) or paginate.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { ...STR, description: 'UNACKNOWLEDGED, ACKNOWLEDGED, or RESOLVED.' },
        page: { ...INT },
        limit: { ...INT, description: 'Default 50, max 200.' },
      },
      additionalProperties: false,
    },
    requiresAuth: true,
    handler: async (args, client) =>
      client.request('GET', '/api/alerts', {
        query: {
          status: pickString(args, 'status'),
          page: pickNumber(args, 'page'),
          limit: pickNumber(args, 'limit'),
        },
      }),
  },

  {
    name: 'vs_alerts_acknowledge',
    description: 'Acknowledge an alert by id. Acknowledgement is recorded with the calling API key\'s user.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { ...STR, description: 'Alert id.' },
        note: { ...STR, description: 'Optional acknowledgement note (visible in alert history).' },
      },
      required: ['id'],
      additionalProperties: false,
    },
    requiresAuth: true,
    handler: async (args, client) =>
      client.request('POST', `/api/alerts/${encodeURIComponent(requireString(args, 'id'))}/acknowledge`, {
        body: { note: pickString(args, 'note') },
      }),
  },

  {
    name: 'vs_status_pages_list',
    description: 'List public-facing status pages owned by the authenticated organization.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    requiresAuth: true,
    handler: async (_args, client) => client.request('GET', '/api/status-pages'),
  },

  {
    name: 'vs_servers_list',
    description: 'List servers (origins) registered in the authenticated organization.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { ...INT },
        limit: { ...INT, description: 'Default 50.' },
      },
      additionalProperties: false,
    },
    requiresAuth: true,
    handler: async (args, client) =>
      client.request('GET', '/api/servers', {
        query: { page: pickNumber(args, 'page'), limit: pickNumber(args, 'limit') },
      }),
  },
];

export function findTool(name: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.name === name);
}

// Suppress unused-warning suppression: BOOL/NUM are reserved for future tools.
void BOOL;
void NUM;
