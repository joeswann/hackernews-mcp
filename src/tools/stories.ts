import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { HNClient } from '../api/client.js';
import { Feed } from '../api/types.js';
import { timeAgo, hnUrl, formatNumber } from '../utils/format.js';

const listStoriesSchema = z.object({
  feed: z.enum(['top', 'new', 'best', 'ask', 'show', 'job']).default('top'),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

export const listStoriesDefinition = {
  name: 'list_stories',
  description: 'Browse Hacker News feeds (top, new, best, ask, show, job) with pagination. Returns titles, URLs, scores, and metadata.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      feed: {
        type: 'string',
        enum: ['top', 'new', 'best', 'ask', 'show', 'job'],
        description: 'Feed type to browse. Default: top',
      },
      limit: {
        type: 'number',
        description: 'Number of stories to return (1-50). Default: 20',
      },
      offset: {
        type: 'number',
        description: 'Number of stories to skip for pagination. Default: 0',
      },
    },
  },
};

export async function listStories(client: HNClient, args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const params = listStoriesSchema.parse(args || {});
    const ids = await client.getStoryIds(params.feed as Feed);
    const slice = ids.slice(params.offset, params.offset + params.limit);
    const items = await client.getItems(slice);

    const lines: string[] = [
      `## ${params.feed.toUpperCase()} Stories (${params.offset + 1}-${params.offset + slice.length} of ${formatNumber(ids.length)})`,
      '',
    ];

    items.forEach((item, i) => {
      if (!item) return;
      const rank = params.offset + i + 1;
      const age = item.time ? timeAgo(item.time) : '';
      const url = item.url || hnUrl(item.id);
      const comments = item.descendants ?? 0;
      lines.push(`${rank}. **${item.title || '(untitled)'}**`);
      lines.push(`   ${url}`);
      lines.push(`   ${formatNumber(item.score ?? 0)} points | ${item.by || 'unknown'} | ${age} | ${formatNumber(comments)} comments | ${hnUrl(item.id)}`);
      lines.push('');
    });

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : 'Unknown error');
  }
}
