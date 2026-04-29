/**
 * Tiny HTTP client for the Visual Sentinel public API.
 *
 * Reads the API key from `VS_API_KEY` (or `VISUALSENTINEL_API_KEY`) once at
 * construction time. All requests are routed at `https://visualsentinel.com`
 * unless `VS_API_BASE` overrides it (useful for testing against a local
 * dev instance).
 */

const DEFAULT_BASE = 'https://visualsentinel.com';

export interface ApiClientOptions {
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  userAgent?: string;
}

export class VsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'VsApiError';
  }
}

export class ApiClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly userAgent: string;

  constructor(opts: ApiClientOptions = {}) {
    this.apiKey =
      opts.apiKey ??
      process.env.VS_API_KEY ??
      process.env.VISUALSENTINEL_API_KEY ??
      undefined;
    this.baseUrl = (opts.baseUrl ?? process.env.VS_API_BASE ?? DEFAULT_BASE).replace(
      /\/+$/,
      '',
    );
    this.userAgent = opts.userAgent ?? '@visualsentinel/mcp-server';
  }

  hasApiKey(): boolean {
    return typeof this.apiKey === 'string' && this.apiKey.length > 0;
  }

  async request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: { query?: Record<string, string | number | boolean | undefined>; body?: unknown; auth?: boolean } = {},
  ): Promise<T> {
    const auth = options.auth ?? true;
    if (auth && !this.hasApiKey()) {
      throw new VsApiError(
        'Visual Sentinel API key required. Set VS_API_KEY (https://visualsentinel.com/settings/api-keys).',
        401,
        null,
      );
    }

    const url = new URL(path.startsWith('/') ? path : `/${path}`, this.baseUrl);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': this.userAgent,
    };
    if (auth && this.apiKey) headers['X-API-Key'] = this.apiKey;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await res.text();
    let parsed: unknown = null;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!res.ok) {
      throw new VsApiError(
        `Visual Sentinel API ${method} ${path} returned ${res.status}`,
        res.status,
        parsed,
      );
    }

    return parsed as T;
  }
}
