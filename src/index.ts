/**
 * Visual Sentinel MCP server (stdio transport).
 *
 * Run via:
 *   VS_API_KEY=vs_live_... npx @visualsentinel/mcp-server
 *
 * The server registers all tools defined in `./tools.ts` with the MCP SDK
 * and answers tools/list and tools/call requests. Public tools (health,
 * DNS check, SSL check, speed test, website check) work without an API key;
 * everything else returns a clear error if VS_API_KEY is not set.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { ApiClient, VsApiError } from './api-client.js';
import { TOOLS, findTool } from './tools.js';

const SERVER_NAME = 'visualsentinel';
const SERVER_VERSION = '0.2.1';

function toMcpToolDescriptor(tool: (typeof TOOLS)[number]) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    annotations: tool.annotations,
    inputSchema: tool.inputSchema,
  };
}

async function main(): Promise<void> {
  const client = new ApiClient();
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(toMcpToolDescriptor),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = findTool(req.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Unknown tool: ${req.params.name}` }],
      };
    }

    try {
      const result = await tool.handler(req.params.arguments ?? {}, client);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const message = err instanceof VsApiError
        ? `Visual Sentinel API error (${err.status}): ${err.message}\n${
            typeof err.body === 'string' ? err.body : JSON.stringify(err.body, null, 2)
          }`
        : err instanceof Error
          ? err.message
          : String(err);
      return {
        isError: true,
        content: [{ type: 'text', text: message }],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[visualsentinel-mcp-server] fatal:', err);
  process.exit(1);
});
