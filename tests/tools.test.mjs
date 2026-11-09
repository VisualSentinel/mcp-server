/**
 * Tests for VS-MCP-Server tools.
 *
 * Verifies that:
 *   1. vs_monitors_uptime builds a request whose query includes `period`
 *      (not just `window`) when a preset window is passed.
 *   2. vs_monitors_uptime uses `from`/`to` query params when both are supplied.
 *   3. vs_monitors_metrics_bulk sends the correct POST body.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

// We import the compiled source via the dist directory so we don't need ts-node.
// However, because this runs before build during TDD, we import directly from
// the TypeScript source transpiled on-the-fly via Node's --import hook when
// available, or we test the observable behaviour via a lightweight shim below.
//
// Strategy: we import the TOOLS array and ApiClient then call the handler with
// a mock client that records the calls made to client.request().

// Import from the compiled dist (built by `npm run build`).
const { TOOLS } = await import('../dist/tools.js');

// ---------------------------------------------------------------------------
// Minimal mock ApiClient
// ---------------------------------------------------------------------------
class MockClient {
  calls = [];

  async request(method, path, options = {}) {
    this.calls.push({ method, path, options });
    return { ok: true };
  }

  hasApiKey() {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function getTool(name) {
  const tool = TOOLS.find((t) => t.name === name);
  assert.ok(tool, `Tool "${name}" not found in TOOLS registry`);
  return tool;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('vs_monitors_uptime', () => {
  it('sends period=30d query param when window="30d" is passed', async () => {
    const tool = getTool('vs_monitors_uptime');
    const client = new MockClient();
    await tool.handler({ id: 'mon-123', window: '30d' }, client);

    assert.equal(client.calls.length, 1, 'should make exactly one request');
    const { method, path, options } = client.calls[0];
    assert.equal(method, 'GET');
    assert.match(path, /\/api\/monitors\/mon-123\/uptime/);
    // Must translate `window` input → `period` query param
    assert.equal(options.query?.period, '30d', 'query.period should be "30d"');
    assert.equal(options.query?.window, undefined, 'query.window should not be sent');
  });

  it('sends from+to query params when both are supplied, overriding window/period', async () => {
    const tool = getTool('vs_monitors_uptime');
    const client = new MockClient();
    await tool.handler(
      { id: 'mon-456', from: '2026-05-01T00:00:00Z', to: '2026-05-31T23:59:59Z' },
      client,
    );

    assert.equal(client.calls.length, 1);
    const { options } = client.calls[0];
    assert.equal(options.query?.from, '2026-05-01T00:00:00Z', 'query.from should be set');
    assert.equal(options.query?.to, '2026-05-31T23:59:59Z', 'query.to should be set');
    // period should NOT be set when from+to are provided
    assert.equal(options.query?.period, undefined, 'query.period should not be set when from+to given');
  });

  it('defaults to period=30d when no window/from/to supplied', async () => {
    const tool = getTool('vs_monitors_uptime');
    const client = new MockClient();
    await tool.handler({ id: 'mon-789' }, client);

    const { options } = client.calls[0];
    assert.equal(options.query?.period, '30d', 'should default to period=30d');
  });

  it('sends all=true and omits period/from/to when all is set (full history)', async () => {
    const tool = getTool('vs_monitors_uptime');
    const client = new MockClient();
    await tool.handler(
      { id: 'mon-all', all: true, window: '7d', from: '2026-01-01T00:00:00Z', to: '2026-02-01T00:00:00Z' },
      client,
    );

    const { options } = client.calls[0];
    assert.equal(options.query?.all, true, 'query.all should be true');
    assert.equal(options.query?.period, undefined, 'period must not be sent when all=true');
    assert.equal(options.query?.from, undefined, 'from must not be sent when all=true');
  });
});

describe('vs_monitors_metrics_bulk', () => {
  it('is registered in the TOOLS array', () => {
    getTool('vs_monitors_metrics_bulk'); // throws if missing
  });

  it('POSTs to /api/monitors/metrics with monitorIds and metric in body', async () => {
    const tool = getTool('vs_monitors_metrics_bulk');
    const client = new MockClient();
    await tool.handler(
      {
        monitorIds: ['mon-001', 'mon-002'],
        metric: 'uptime',
        window: '7d',
      },
      client,
    );

    assert.equal(client.calls.length, 1);
    const { method, path, options } = client.calls[0];
    assert.equal(method, 'POST');
    assert.match(path, /\/api\/monitors\/metrics/);
    assert.deepEqual(options.body?.monitorIds, ['mon-001', 'mon-002']);
    assert.equal(options.body?.metric, 'uptime');
    assert.equal(options.body?.period, '7d', 'window should be mapped to body.period');
  });

  it('sets body.from and body.to when custom range supplied', async () => {
    const tool = getTool('vs_monitors_metrics_bulk');
    const client = new MockClient();
    await tool.handler(
      {
        monitorIds: ['mon-001'],
        metric: 'response-time',
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-31T23:59:59Z',
      },
      client,
    );

    const { options } = client.calls[0];
    assert.equal(options.body?.from, '2026-01-01T00:00:00Z');
    assert.equal(options.body?.to, '2026-01-31T23:59:59Z');
    assert.equal(options.body?.period, undefined, 'period should not be set when from+to given');
  });

  it('defaults to period=30d in body when no window/from/to supplied', async () => {
    const tool = getTool('vs_monitors_metrics_bulk');
    const client = new MockClient();
    await tool.handler(
      { monitorIds: ['mon-001'], metric: 'uptime' },
      client,
    );

    assert.equal(client.calls[0].options.body?.period, '30d');
  });

  it('sets body.all and omits period/from/to when all is set (full history)', async () => {
    const tool = getTool('vs_monitors_metrics_bulk');
    const client = new MockClient();
    await tool.handler(
      { monitorIds: ['mon-001'], metric: 'uptime', all: true, window: '7d' },
      client,
    );

    const { options } = client.calls[0];
    assert.equal(options.body?.all, true, 'body.all should be true');
    assert.equal(options.body?.period, undefined, 'period must not be set when all=true');
    assert.equal(options.body?.from, undefined, 'from must not be set when all=true');
  });
});

describe('public tool query parameters match the API', () => {
  it('vs_ssl_check sends ?domain= (the API ignores ?host=)', async () => {
    const tool = getTool('vs_ssl_check');
    const client = new MockClient();
    await tool.handler({ domain: 'example.com' }, client);
    assert.equal(client.calls[0].path, '/api/tools/ssl-check');
    assert.equal(client.calls[0].options.query?.domain, 'example.com');
    assert.equal(client.calls[0].options.query?.host, undefined);
  });

  it('vs_ssl_check still accepts host as an alias', async () => {
    const tool = getTool('vs_ssl_check');
    const client = new MockClient();
    await tool.handler({ host: 'example.com' }, client);
    assert.equal(client.calls[0].options.query?.domain, 'example.com');
  });

  it('vs_dns_check sends ?type= for the record type', async () => {
    const tool = getTool('vs_dns_check');
    const client = new MockClient();
    await tool.handler({ domain: 'example.com', recordType: 'MX' }, client);
    assert.equal(client.calls[0].options.query?.type, 'MX');
    assert.equal(client.calls[0].options.query?.recordType, undefined);
  });
});

describe('tool annotations', () => {
  it('every tool has a title and all four hints as booleans', () => {
    for (const t of TOOLS) {
      assert.ok(t.title && t.title.length > 0, `${t.name} needs a title`);
      for (const h of ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint']) {
        assert.equal(typeof t.annotations[h], 'boolean', `${t.name}.${h}`);
      }
    }
  });

  it('write tools are not marked read-only', () => {
    for (const n of ['vs_monitors_create', 'vs_monitors_check_now', 'vs_alerts_acknowledge']) {
      assert.equal(getTool(n).annotations.readOnlyHint, false, n);
    }
  });

  it('tool names stay within 64 characters', () => {
    for (const t of TOOLS) assert.ok(t.name.length <= 64, t.name);
  });
});

describe('prompts, resources and version', async () => {
  const { PROMPTS, findPrompt } = await import('../dist/prompts.js');
  const { RESOURCES, findResource } = await import('../dist/resources.js');
  const { SERVER_VERSION } = await import('../dist/version.js');
  const { API_KEY_PLANS, MONEY_BACK_SENTENCE, NO_FREE_PLAN_SENTENCE } = await import('../dist/plan-copy.js');
  const { readFileSync } = await import('node:fs');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  it('SERVER_VERSION equals package.json version', () => {
    assert.equal(SERVER_VERSION, pkg.version);
  });

  it('prompts reference only real tools and need no hidden arguments', () => {
    const names = new Set(TOOLS.map((t) => t.name));
    for (const p of PROMPTS) {
      const args = {};
      for (const a of p.arguments) args[a.name] = 'example.com';
      const text = p.build(args);
      for (const m of text.match(/vs_[a-z_]+/g) ?? []) assert.ok(names.has(m), `${p.name} mentions unknown tool ${m}`);
      assert.ok(text.length > 200, p.name);
    }
    assert.equal(PROMPTS.length, 4);
  });

  it('required prompt arguments are enforced', () => {
    assert.throws(() => findPrompt('check_website_health').build({}), /required/);
  });

  it('public-tool prompts do not call account tools', () => {
    const text = findPrompt('check_website_health').build({ url: 'https://example.com' });
    assert.ok(!/vs_monitors|vs_incidents|vs_alerts/.test(text));
  });

  it('resources read as non-empty markdown and stay inside the fact sheet', () => {
    assert.equal(RESOURCES.length, 3);
    // The only Free-plan and guarantee statements allowed are these facts.
    const allowed = [
      NO_FREE_PLAN_SENTENCE,
      MONEY_BACK_SENTENCE,
      'Workspaces that already had the Free plan keep it.',
      'The older Free plan has no API keys.',
    ];
    for (const r of RESOURCES) {
      let body = findResource(r.uri).read();
      assert.ok(body.length > 100, r.uri);
      for (const sentence of allowed) body = body.replace(sentence, '');
      assert.ok(!/free plan|free tier|99\.\d|instantly|never miss|guarantee/i.test(body), r.uri);
    }
    assert.ok(findResource('visualsentinel://tools').read().includes('vs_ssl_check'));
  });

  it('the plans resource states the current offer (2026-11-09)', () => {
    const plans = findResource('visualsentinel://plans').read();
    assert.ok(plans.includes('(as of 2026-11-09)'));
    for (const fact of [
      NO_FREE_PLAN_SENTENCE,
      'a free first check of its site, then a 10-day free trial of a paid plan or an immediate subscription',
      'No card is needed for the trial with a work email.',
      'With a personal email address, you add a card ($0 today, billed on day 11 unless you cancel).',
      'When a trial without a card ends, monitoring pauses until you subscribe',
      'One trial per customer.',
      MONEY_BACK_SENTENCE,
      `API keys come with ${API_KEY_PLANS}.`,
    ]) assert.ok(plans.includes(fact), fact);
    const rows = {
      Solo: '| Solo | $15 a month or $150 a year | 10 | every 5 minutes | 1 site, up to 4 pages, every 30 minutes | 1 | yes |',
      Starter: '| Starter | $30 a month or $300 a year | 15 | every 5 minutes | 5 sites, up to 6 pages each, every 15 minutes | 1 | yes |',
      Business: '| Business | $80 a month or $800 a year | 60 | every minute | 60 sites, up to 6 pages each, every 15 minutes | 5 | yes |',
      Agency: '| Agency | $300 a month or $3,000 a year | 300 | every minute | 300 sites, up to 6 pages each, every 15 minutes | 50 | yes |',
    };
    for (const [plan, row] of Object.entries(rows)) assert.ok(plans.includes(row), plan);
  });

  it('no shipped text carries the old offer', () => {
    const texts = [
      ...RESOURCES.map((r) => findResource(r.uri).read()),
      ...PROMPTS.map((p) => {
        const args = {};
        for (const a of p.arguments) args[a.name] = 'example.com';
        return `${p.description}\n${p.build(args)}`;
      }),
    ];
    const files = ['package.json', 'server.json', 'README.md', 'llms-install.md', 'gemini-extension.json', '.claude-plugin/plugin.json', '.cursor-plugin/plugin.json'];
    for (const f of files) texts.push(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
    const stale = /7-day|card required|(?<!Starter, )Business (and|or) Agency|\$6\b|\$12\b|\$39\b|\$149\b|14-day|\u2014/i;
    for (const t of texts) assert.ok(!stale.test(t), t.match(stale)?.[0]);
  });

  it('the npm description fits the registry search field (255 characters)', () => {
    assert.ok(pkg.description.length <= 255, String(pkg.description.length));
    assert.ok(pkg.description.includes('every paid plan'));
  });

  it('every manifest carries the package version', () => {
    const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
    const lock = read('package-lock.json');
    const server = read('server.json');
    assert.equal(lock.version, pkg.version);
    assert.equal(lock.packages[''].version, pkg.version);
    assert.equal(server.version, pkg.version);
    for (const p of server.packages) assert.equal(p.version, pkg.version);
    for (const f of ['gemini-extension.json', '.claude-plugin/plugin.json', '.cursor-plugin/plugin.json']) assert.equal(read(f).version, pkg.version, f);
  });

  it('account tools return a clear no-key error, not a crash', async () => {
    const { ApiClient } = await import('../dist/api-client.js');
    const client = new ApiClient({ apiKey: undefined });
    delete process.env.VS_API_KEY; delete process.env.VISUALSENTINEL_API_KEY;
    const c2 = new ApiClient();
    const tool = TOOLS.find((t) => t.name === 'vs_monitors_list');
    await assert.rejects(() => tool.handler({}, c2), (err) => err.message.includes(`API keys come with ${API_KEY_PLANS}.`) && !/(?<!Starter, )Business (and|or) Agency/.test(err.message));
    void client;
  });
});
