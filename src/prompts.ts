/**
 * MCP prompts: ready-made workflows built on the Visual Sentinel tools.
 * Each prompt returns one user message that tells the assistant which tools to
 * call and how to report back. They work without an API key unless noted.
 */

export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface PromptDefinition {
  name: string;
  title: string;
  description: string;
  arguments: PromptArgument[];
  /** Builds the user message for the given arguments. */
  build: (args: Record<string, string | undefined>) => string;
}

function need(args: Record<string, string | undefined>, key: string): string {
  const v = args[key]?.trim();
  if (!v) throw new Error(`Argument "${key}" is required.`);
  return v;
}

function hostOf(value: string): string {
  return value.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
}

export const PROMPTS: PromptDefinition[] = [
  {
    name: 'check_website_health',
    title: 'Check a website\'s health',
    description:
      'Run uptime, SSL, DNS and speed checks on one site and summarise what needs attention. No account or API key needed.',
    arguments: [
      { name: 'url', description: 'Site to check, e.g. https://example.com', required: true },
    ],
    build: (args) => {
      const url = need(args, 'url');
      const host = hostOf(url);
      return [
        `Check the health of ${url} with the Visual Sentinel tools and report back in plain language.`,
        '',
        `1. vs_website_check with url "${url}": HTTP status, response time, server header.`,
        `2. vs_ssl_check with domain "${host}": certificate validity, expiry date and chain.`,
        `3. vs_dns_check with domain "${host}": A, AAAA, MX, NS and TXT records.`,
        `4. vs_speed_test with url "${url}": time to first byte, total load time, transfer size, redirects.`,
        '',
        'Then give: a one-line verdict, a short list of anything that looks wrong (non-200 status, certificate close to expiry, missing or odd DNS records, slow response, long redirect chain), and the one fix to do first. Say which checks succeeded and which returned an error. Do not guess at anything a tool did not return.',
      ].join('\n');
    },
  },
  {
    name: 'investigate_broken_site',
    title: 'Investigate why my site looks broken',
    description:
      'Work out why a site is down, slow or looking wrong by checking each layer in order. With an API key it also reads open incidents and recent alerts.',
    arguments: [
      { name: 'url', description: 'The affected page, e.g. https://example.com/pricing', required: true },
      { name: 'symptom', description: 'What you see, e.g. "blank page", "images missing", "very slow"', required: false },
    ],
    build: (args) => {
      const url = need(args, 'url');
      const host = hostOf(url);
      const symptom = args.symptom?.trim();
      return [
        `${symptom ? `The page ${url} shows this problem: ${symptom}.` : `Something looks wrong on ${url}.`} Find the most likely layer at fault, using the Visual Sentinel tools in this order and stopping to report as soon as you find a clear cause:`,
        '',
        `1. DNS: vs_dns_check for "${host}". Do the records resolve, and do they point where they should?`,
        `2. TLS: vs_ssl_check for "${host}". Is the certificate valid, unexpired and issued for this hostname?`,
        `3. Server response: vs_website_check for "${url}". Status code, response time, content snippet.`,
        `4. Speed: vs_speed_test for "${url}". Is time to first byte or load time unusually high, and is there a redirect chain?`,
        '5. If a Visual Sentinel API key is configured: vs_monitors_list to find a monitor for this site, then vs_incidents_list and vs_alerts_list for it, and vs_monitors_uptime for the last 24 hours. If no key is set, say that account data was not checked.',
        '',
        'A page can return HTTP 200 and still look broken (missing styles, empty content, a failed script). If every check above is healthy, say so and suggest comparing the page against an earlier screenshot, which is what Visual Sentinel visual monitoring does.',
        'Report: the evidence from each step, the most likely cause, and the next action.',
      ].join('\n');
    },
  },
  {
    name: 'pre_launch_checklist',
    title: 'Pre-launch checklist for a site',
    description:
      'Check a new or migrated site before it goes live: DNS, certificate, response and speed, then a short list of fixes. No API key needed.',
    arguments: [
      { name: 'domain', description: 'The domain being launched, e.g. example.com', required: true },
    ],
    build: (args) => {
      const domain = hostOf(need(args, 'domain'));
      return [
        `Run a pre-launch check on ${domain} with the Visual Sentinel tools and return a checklist with Pass, Warn or Fail for each line.`,
        '',
        `- DNS: vs_dns_check for "${domain}" and for "www.${domain}". Both resolve, and the records point to the intended host. Check MX and TXT (SPF) records if the domain sends email.`,
        `- Certificate: vs_ssl_check for "${domain}" and for "www.${domain}". Valid, issued for the hostname, and more than 30 days from expiry.`,
        `- Response: vs_website_check for "https://${domain}" and "https://www.${domain}". Both return 200 or one cleanly redirects to the other.`,
        `- Speed: vs_speed_test for "https://${domain}". Report time to first byte, total load time and redirect count.`,
        '',
        'Finish with the Fail items first, each with a concrete fix, then the Warn items. Add one line suggesting monitors to create after launch (uptime on the home page, certificate expiry, DNS records), and say that creating them needs a Visual Sentinel account with an API key. Do not create anything unless asked.',
      ].join('\n');
    },
  },
  {
    name: 'triage_open_incidents',
    title: 'Triage open incidents',
    description:
      'Review open incidents and unacknowledged alerts on your account and rank what to look at first. Needs a Visual Sentinel API key (Business and Agency plans).',
    arguments: [],
    build: () =>
      [
        'Review my Visual Sentinel account and tell me what needs attention first.',
        '',
        '1. vs_incidents_list with status OPEN, then vs_incidents_get for each one (up to 5, most recent first).',
        '2. vs_alerts_list with status UNACKNOWLEDGED.',
        '3. For each affected monitor, vs_monitors_get and vs_monitors_uptime for the last 24 hours.',
        '',
        'Rank the incidents by customer impact (production sites and checkout pages before staging), group alerts that belong to the same incident, and give one suggested next step for each. If the tools return an "API key required" error, tell me that account tools need an API key from the Business or Agency plan, and stop. Ask before acknowledging any alert.',
      ].join('\n'),
  },
];

export function findPrompt(name: string): PromptDefinition | undefined {
  return PROMPTS.find((p) => p.name === name);
}
