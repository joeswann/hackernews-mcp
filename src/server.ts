import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getConfig } from './config/index.js';
import { HNClient } from './api/client.js';
import { listStoriesDefinition, listStories } from './tools/stories.js';
import { getItemDefinition, getItem } from './tools/item.js';
import { getCommentsDefinition, getComments } from './tools/comments.js';
import { searchDefinition, search } from './tools/search.js';
import { getUserDefinition, getUser, getUserSubmissionsDefinition, getUserSubmissions } from './tools/user.js';

export async function createServer() {
  const config = getConfig();
  const client = new HNClient(config);

  const server = new Server(
    { name: 'hn-mcp', version: '1.0.0', description: `Hacker News MCP server. Read-only access to stories, comments, users, and search.${config.HN_USERNAME ? ` Configured user: ${config.HN_USERNAME}. When the user says "my profile" or "my submissions", use this username.` : ''}` },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      listStoriesDefinition,
      getItemDefinition,
      getCommentsDefinition,
      searchDefinition,
      getUserDefinition,
      getUserSubmissionsDefinition,
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    switch (name) {
      case 'list_stories': return await listStories(client, args);
      case 'get_item': return await getItem(client, args);
      case 'get_comments': return await getComments(client, args);
      case 'search': return await search(client, args);
      case 'get_user': return await getUser(client, args);
      case 'get_user_submissions': return await getUserSubmissions(client, args);
      default: throw new Error(`Unknown tool: ${name}`);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
