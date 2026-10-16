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

export interface ToolAnnotations {
  title: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export interface ToolDefinition {
  name: string;
  /** Human-readable title shown by MCP clients. */
  title: string;
  description: string;
  annotations: ToolAnnotations;
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
    title: 'Check Visual Sentinel service health',
    annotations: {
      title: 'Check Visual Sentinel service health',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
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
    title: 'Look up DNS records',
    annotations: {
      title: 'Look up DNS records',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
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
          // The API reads ?type= (not recordType).
          type: pickString(args, 'recordType'),
        },
      }),
  },

  {
    name: 'vs_ssl_check',
    title: 'Inspect an SSL certificate',
    annotations: {
      title: 'Inspect an SSL certificate',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    description:
      'Inspect a TLS/SSL certificate for a hostname: issuer, subject, validity dates, SAN list, key algorithm, and certificate chain. No authentication required.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { ...STR, description: 'Hostname to inspect, e.g. example.com (without protocol).' },
      },
      required: ['domain'],
      additionalProperties: false,
    },
    requiresAuth: false,
    handler: async (args, client) =>
      client.request('GET', '/api/tools/ssl-check', {
        auth: false,
        // The API reads ?domain=. `host` stays as an input alias for 0.1.x callers.
        query: { domain: pickString(args, 'domain') ?? requireString(args, 'host') },
      }),
  },

  {
    name: 'vs_speed_test',
    title: 'Run a one-shot speed test',
    annotations: {
      title: 'Run a one-shot speed test',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
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
    title: 'Check a website',
    annotations: {
      title: 'Check a website',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
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
    title: 'List monitors',
    annotations: {
      title: 'List monitors',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    title: 'Get a monitor',
    annotations: {
      title: 'Get a monitor',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    title: 'Create a monitor',
    annotations: {
      title: 'Create a monitor',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    title: 'Run a monitor check now',
    annotations: {
      title: 'Run a monitor check now',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    title: 'Get monitor uptime',
    annotations: {
      title: 'Get monitor uptime',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    description:
      'Fetch the uptime percentage and time-series breakdown for a monitor. Use `window` for a preset window (24h, 7d, 30d, 90d, 365d; default 30d), supply both `from` and `to` (ISO 8601) for a custom date range, or set `all: true` for the full available history.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { ...STR, description: 'Monitor id.' },
        window: {
          ...STR,
          description: 'Preset window: 1h, 6h, 24h, 7d, 30d, 90d, 365d. Default 30d. Ignored when from+to or all are supplied.',
        },
        from: {
          ...STR,
          description: 'ISO 8601 start of a custom range (e.g. 2026-01-01T00:00:00Z). Must be supplied with `to`.',
        },
        to: {
          ...STR,
          description: 'ISO 8601 end of a custom range. Must be supplied with `from`.',
        },
        all: {
          type: 'boolean',
          description: 'Return the full available history from the earliest stored data. Takes precedence over from/to and window.',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    requiresAuth: true,
    handler: async (args, client) => {
      const from = pickString(args, 'from');
      const to = pickString(args, 'to');
      // Precedence mirrors the API: all > from/to > window/period.
      const query = args['all'] === true
        ? { all: true }
        : (from && to)
          ? { from, to }
          : { period: pickString(args, 'window') ?? '30d' };
      return client.request(
        'GET',
        `/api/monitors/${encodeURIComponent(requireString(args, 'id'))}/uptime`,
        { query },
      );
    },
  },

  {
    name: 'vs_monitors_metrics_bulk',
    title: 'Get bulk monitor metrics',
    annotations: {
      title: 'Get bulk monitor metrics',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    description:
      'Fetch uptime or response-time metrics for up to 100 monitors in a single request. Use `window` for a preset window (1h, 6h, 24h, 7d, 30d, 90d, 365d; default 30d), supply both `from` and `to` (ISO 8601) for a custom date range, or set `all: true` for the full available history. Returns a `monitors` object keyed by monitor id.',
    inputSchema: {
      type: 'object',
      properties: {
        monitorIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of monitor IDs to fetch metrics for (max 100).',
        },
        metric: {
          ...STR,
          description: 'Metric to return: "uptime" or "response-time".',
        },
        window: {
          ...STR,
          description: 'Preset window: 1h, 6h, 24h, 7d, 30d, 90d, 365d. Default 30d. Ignored when from+to or all are supplied.',
        },
        from: {
          ...STR,
          description: 'ISO 8601 start of a custom range (e.g. 2026-01-01T00:00:00Z). Must be supplied with `to`.',
        },
        to: {
          ...STR,
          description: 'ISO 8601 end of a custom range. Must be supplied with `from`.',
        },
        all: {
          type: 'boolean',
          description: 'Return the full available history from the earliest stored data. Takes precedence over from/to and window.',
        },
      },
      required: ['monitorIds', 'metric'],
      additionalProperties: false,
    },
    requiresAuth: true,
    handler: async (args, client) => {
      const monitorIds = args['monitorIds'];
      if (!Array.isArray(monitorIds) || monitorIds.length === 0) {
        throw new Error('Argument "monitorIds" must be a non-empty array.');
      }
      const from = pickString(args, 'from');
      const to = pickString(args, 'to');
      const body: Record<string, unknown> = {
        monitorIds,
        metric: requireString(args, 'metric'),
      };
      // Precedence mirrors the API: all > from/to > window/period.
      if (args['all'] === true) {
        body['all'] = true;
      } else if (from && to) {
        body['from'] = from;
        body['to'] = to;
      } else {
        body['period'] = pickString(args, 'window') ?? '30d';
      }
      return client.request('POST', '/api/monitors/metrics', { body });
    },
  },

  {
    name: 'vs_incidents_list',
    title: 'List incidents',
    annotations: {
      title: 'List incidents',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    title: 'Get an incident',
    annotations: {
      title: 'Get an incident',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    title: 'List alerts',
    annotations: {
      title: 'List alerts',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    title: 'Acknowledge an alert',
    annotations: {
      title: 'Acknowledge an alert',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    title: 'List status pages',
    annotations: {
      title: 'List status pages',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    title: 'List servers',
    annotations: {
      title: 'List servers',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
