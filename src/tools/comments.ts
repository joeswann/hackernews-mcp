import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { HNClient } from '../api/client.js';
import { HNItem } from '../api/types.js';
import { timeAgo, stripHtml, hnUrl } from '../utils/format.js';

const getCommentsSchema = z.object({
  story_id: z.number({ required_error: 'story_id is required' }),
  depth: z.number().min(1).max(5).default(3),
  limit: z.number().min(1).max(100).default(30),
});

export const getCommentsDefinition = {
  name: 'get_comments',
  description: 'Get threaded comments for a Hacker News story. Returns comments with indentation showing reply depth. Skips dead and deleted comments.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      story_id: {
        type: 'number',
        description: 'The HN story ID to get comments for',
      },
      depth: {
        type: 'number',
        description: 'Maximum reply depth to fetch (1-5). Default: 3',
      },
      limit: {
        type: 'number',
        description: 'Maximum total comments to return (1-100). Default: 30',
      },
    },
    required: ['story_id'],
  },
};

type CommentLine = { text: string };
let commentCount = 0;

async function fetchComments(
  client: HNClient,
  ids: number[],
  currentDepth: number,
  maxDepth: number,
  limit: number,
  lines: CommentLine[],
): Promise<void> {
  if (currentDepth > maxDepth || commentCount >= limit || ids.length === 0) return;

  const items = await client.getItems(ids);

  for (const item of items) {
    if (commentCount >= limit) break;
    if (!item || item.deleted || item.dead) continue;

    const indent = '  '.repeat(currentDepth);
    const age = item.time ? timeAgo(item.time) : '';
    const text = stripHtml(item.text);

    lines.push({ text: `${indent}**${item.by || 'unknown'}** (${age}) ${hnUrl(item.id)}` });
    if (text) {
      const textLines = text.split('\n');
      for (const line of textLines) {
        lines.push({ text: `${indent}${line}` });
      }
    }
    lines.push({ text: '' });
    commentCount++;

    if (item.kids && item.kids.length > 0 && currentDepth < maxDepth) {
      await fetchComments(client, item.kids, currentDepth + 1, maxDepth, limit, lines);
    }
  }
}

export async function getComments(client: HNClient, args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const params = getCommentsSchema.parse(args);
    const story = await client.getItem(params.story_id);

    if (!story) {
      throw new McpError(ErrorCode.InvalidRequest, `Story ${params.story_id} not found`);
    }

    const header = [
      `## Comments for: ${story.title || `Item ${story.id}`}`,
      `${story.descendants ?? 0} total comments | Showing up to ${params.limit} at depth ${params.depth}`,
      '',
    ];

    const lines: CommentLine[] = [];
    commentCount = 0;

    if (story.kids && story.kids.length > 0) {
      await fetchComments(client, story.kids, 0, params.depth, params.limit, lines);
    }

    if (lines.length === 0) {
      header.push('No comments yet.');
    }

    const result = [...header, ...lines.map(l => l.text)].join('\n');
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    if (error instanceof McpError) throw error;
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : 'Unknown error');
  }
}
