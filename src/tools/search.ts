import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { HNClient } from '../api/client.js';
import { timeAgo, hnUrl, formatNumber } from '../utils/format.js';

const searchSchema = z.object({
  query: z.string({ required_error: 'query is required' }).min(1),
  type: z.enum(['story', 'comment', 'all']).default('story'),
  sort: z.enum(['relevance', 'date']).default('relevance'),
  page: z.number().min(0).default(0),
  hits_per_page: z.number().min(1).max(50).default(20),
});

export const searchDefinition = {
  name: 'search',
  description: 'Search Hacker News using Algolia. Search stories, comments, or all items by relevance or date.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query string',
      },
      type: {
        type: 'string',
        enum: ['story', 'comment', 'all'],
        description: 'Type of items to search. Default: story',
      },
      sort: {
        type: 'string',
        enum: ['relevance', 'date'],
        description: 'Sort order. Default: relevance',
      },
      page: {
        type: 'number',
        description: 'Page number (0-indexed). Default: 0',
      },
      hits_per_page: {
        type: 'number',
        description: 'Results per page (1-50). Default: 20',
      },
    },
    required: ['query'],
  },
};

export async function search(client: HNClient, args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const params = searchSchema.parse(args);
    const tags = params.type === 'all' ? undefined : params.type;
    const response = await client.search(params.query, {
      tags,
      sort: params.sort,
      page: params.page,
      hitsPerPage: params.hits_per_page,
    });

    const lines: string[] = [
      `## Search: "${params.query}" (${params.type}, by ${params.sort})`,
      `${formatNumber(response.nbHits)} results | Page ${response.page + 1} of ${response.nbPages}`,
      '',
    ];

    for (const hit of response.hits) {
      const id = parseInt(hit.objectID, 10);
      const age = timeAgo(hit.created_at_i);
      const isStory = hit._tags.includes('story');

      if (isStory) {
        lines.push(`**${hit.title || '(untitled)'}**`);
        if (hit.url) lines.push(`  ${hit.url}`);
        lines.push(`  ${formatNumber(hit.points ?? 0)} points | ${hit.author} | ${age} | ${formatNumber(hit.num_comments ?? 0)} comments | ${hnUrl(id)}`);
      } else {
        const context = hit.story_title ? ` on "${hit.story_title}"` : '';
        const text = (hit.comment_text || '').replace(/<[^>]+>/g, '').slice(0, 200);
        lines.push(`**Comment by ${hit.author}**${context} (${age})`);
        if (text) lines.push(`  ${text}${text.length >= 200 ? '...' : ''}`);
        lines.push(`  ${hnUrl(id)}`);
      }
      lines.push('');
    }

    if (response.hits.length === 0) {
      lines.push('No results found.');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : 'Unknown error');
  }
}
