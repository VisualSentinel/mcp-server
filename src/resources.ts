/**
 * MCP resources: read-only reference material the assistant can attach as
 * context. Static on purpose, so they work without an API key and never touch
 * account data. Plan prices and limits mirror the public pricing page as of
 * PLANS_AS_OF; https://visualsentinel.com/pricing is always current.
 */

import { TOOLS } from './tools.js';
import { API_KEY_PLANS, API_KEY_PLANS_SHORT, MONEY_BACK_SENTENCE, NO_FREE_PLAN_SENTENCE } from './plan-copy.js';

export interface ResourceDefinition {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: string;
  read: () => string;
}

const PLANS_AS_OF = '2026-11-09';

const PLANS = `# Visual Sentinel plans and limits (as of ${PLANS_AS_OF})

Prices and the current list are always at https://visualsentinel.com/pricing. ${NO_FREE_PLAN_SENTENCE} A new workspace gets a free first check of its site, then a 10-day free trial of a paid plan or an immediate subscription. No card is needed for the trial with a work email. With a personal email address, you add a card ($0 today, billed on day 11 unless you cancel). When a trial without a card ends, monitoring pauses until you subscribe; your sites, history and settings are kept. One trial per customer. ${MONEY_BACK_SENTENCE} Workspaces that already had the Free plan keep it.

Prices are in US dollars before tax. Yearly costs 10 months of monthly.

| Plan | Price | Monitors | Fastest uptime check | Sites with screenshot checks | Status pages | API keys and MCP account tools |
|---|---|---|---|---|---|---|
| Solo | $15 a month or $150 a year | 10 | every 5 minutes | 1 site, up to 4 pages, every 30 minutes | 1 | yes |
| Starter | $30 a month or $300 a year | 15 | every 5 minutes | 5 sites, up to 6 pages each, every 15 minutes | 1 | yes |
| Business | $80 a month or $800 a year | 60 | every minute | 60 sites, up to 6 pages each, every 15 minutes | 5 | yes |
| Agency | $300 a month or $3,000 a year | 300 | every minute | 300 sites, up to 6 pages each, every 15 minutes | 50 | yes |

- A site with screenshot checks is the URL you add plus the extra pages your plan includes. It also gets uptime checks and counts toward the monitor total. Content checks start on Starter.
- The five public tools (vs_health, vs_dns_check, vs_ssl_check, vs_speed_test, vs_website_check) need no account.
- The twelve account tools need an API key. API keys come with ${API_KEY_PLANS}. Create one at https://visualsentinel.com/settings/api-keys.
- The older Free plan has no API keys. Keys also stop working while the workspace has no active plan or trial (for example after a trial without a card ends, or while a subscription is paused) and work again once a paid plan is active.
- Checks run from Europe and the US, plus Asia Pacific on every paid plan. Alert channels on every paid plan: email, Slack, Discord, Microsoft Teams, Telegram, PagerDuty, Opsgenie, webhooks, WhatsApp, Prometheus, and push notifications in the mobile app.
`;

const HELP = `# Using the Visual Sentinel MCP server

Visual Sentinel catches pages that look broken even when the site is up. It watches uptime, performance, SSL certificates, DNS, visual changes and content changes.

## Start without an account
Ask for a DNS lookup, an SSL certificate check, a speed test or a website check on any public site. These five tools need no account or key.

## Connect your account
1. Get an API key (${API_KEY_PLANS_SHORT}): https://visualsentinel.com/settings/api-keys
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
    (t) => `| ${t.name} | ${t.requiresAuth ? 'API key (any paid plan or trial)' : 'none'} | ${t.annotations.readOnlyHint ? 'read-only' : 'changes data'} | ${(t.description.split('. ')[0] ?? '').replace(/\.$/, '')} |`,
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
