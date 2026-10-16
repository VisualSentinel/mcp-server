/**
 * MCP resources: read-only reference material the assistant can attach as
 * context. Static on purpose, so they work without an API key and never touch
 * account data. Plan limits come from the public pricing page; check
 * https://visualsentinel.com/pricing for current prices.
 */

import { TOOLS } from './tools.js';

export interface ResourceDefinition {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: string;
  read: () => string;
}

const PLANS_AS_OF = '2026-10-16';

const PLANS = `# Visual Sentinel plans and limits (as of ${PLANS_AS_OF})

Prices and the current list are always at https://visualsentinel.com/pricing. There is no free plan for new accounts: a new workspace gets a first check of its site, then a 7-day trial (card required) or a paid plan.

| Plan | Monitors | Fastest uptime check | Visual pages | Status pages | API keys and MCP account tools |
|---|---|---|---|---|---|
| Solo | 10 | every 5 minutes | 1 site, every 30 minutes | 1 | no |
| Starter | 15 | every 5 minutes | 5, every 15 minutes | 1 | no |
| Business | 60 | every 1 minute | 60, every 15 minutes | 5 | yes |
| Agency | 300 | every 1 minute | 300, every 15 minutes | 50 | yes |

- The five public tools (vs_health, vs_dns_check, vs_ssl_check, vs_speed_test, vs_website_check) need no account.
- The twelve account tools need an API key, which is available on the Business and Agency plans. Create one at https://visualsentinel.com/settings/api-keys.
- Checks run from Europe and the US. Alert channels on every plan: email, Slack, Discord, Microsoft Teams, Telegram, PagerDuty, Opsgenie, webhooks, WhatsApp, Prometheus, and push notifications in the mobile app.
`;

const HELP = `# Using the Visual Sentinel MCP server

Visual Sentinel catches pages that look broken even when the site is up. It watches uptime, performance, SSL certificates, DNS, visual changes and content changes.

## Start without an account
Ask for a DNS lookup, an SSL certificate check, a speed test or a website check on any public site. These five tools need no account or key.

## Connect your account
1. Get an API key (Business and Agency plans): https://visualsentinel.com/settings/api-keys
2. Set it as VS_API_KEY (or VISUALSENTINEL_API_KEY) in your MCP client's environment for this server.
3. Restart the client. Monitor, uptime, incident, alert, status-page and server tools now work.

## Ready-made prompts
check_website_health, investigate_broken_site, pre_launch_checklist and triage_open_incidents.

## Links
- Docs and install: https://visualsentinel.com/mcp
- API reference: https://visualsentinel.com/docs
- Pricing: https://visualsentinel.com/pricing
- Source: https://github.com/VisualSentinel/mcp-server
- Support: https://visualsentinel.com/contact
`;

function toolsReference(): string {
  const rows = TOOLS.map(
    (t) => `| ${t.name} | ${t.requiresAuth ? 'API key (Business and Agency)' : 'none'} | ${t.annotations.readOnlyHint ? 'read-only' : 'changes data'} | ${(t.description.split('. ')[0] ?? '').replace(/\.$/, '')} |`,
  );
  return [
    '# Visual Sentinel tools',
    '',
    '| Tool | Needs | Type | What it does |',
    '|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}

export const RESOURCES: ResourceDefinition[] = [
  {
    uri: 'visualsentinel://plans',
    name: 'plans',
    title: 'Plans and limits',
    description: 'Monitor counts, check frequencies and which plans include API keys and the MCP account tools.',
    mimeType: 'text/markdown',
    read: () => PLANS,
  },
  {
    uri: 'visualsentinel://help',
    name: 'help',
    title: 'Help and setup',
    description: 'How to use the server without an account, how to add an API key, and where the docs are.',
    mimeType: 'text/markdown',
    read: () => HELP,
  },
  {
    uri: 'visualsentinel://tools',
    name: 'tools',
    title: 'Tool reference',
    description: 'Every tool, whether it needs an API key, and whether it is read-only.',
    mimeType: 'text/markdown',
    read: toolsReference,
  },
];

export function findResource(uri: string): ResourceDefinition | undefined {
  return RESOURCES.find((r) => r.uri === uri);
}
