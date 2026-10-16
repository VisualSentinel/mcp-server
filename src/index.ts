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
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { ApiClient, VsApiError } from './api-client.js';
import { TOOLS, findTool } from './tools.js';
import { PROMPTS, findPrompt } from './prompts.js';
import { SERVER_VERSION } from './version.js';
import { RESOURCES, findResource } from './resources.js';

const SERVER_NAME = 'visualsentinel';

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
    { capabilities: { tools: {}, prompts: {}, resources: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(toMcpToolDescriptor),
  }));

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: PROMPTS.map((p) => ({
      name: p.name,
      title: p.title,
      description: p.description,
      arguments: p.arguments,
    })),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (req) => {
    const prompt = findPrompt(req.params.name);
    if (!prompt) throw new McpError(ErrorCode.InvalidParams, `Unknown prompt: ${req.params.name}`);
    let text: string;
    try {
      text = prompt.build(req.params.arguments ?? {});
    } catch (err) {
      throw new McpError(ErrorCode.InvalidParams, err instanceof Error ? err.message : String(err));
    }
    return {
      description: prompt.description,
      messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }],
    };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: RESOURCES.map((r) => ({
      uri: r.uri,
      name: r.name,
      title: r.title,
      description: r.description,
      mimeType: r.mimeType,
    })),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const resource = findResource(req.params.uri);
    if (!resource) throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${req.params.uri}`);
    return { contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: resource.read() }] };
  });

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
