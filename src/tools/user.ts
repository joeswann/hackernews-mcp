import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { HNClient } from '../api/client.js';
import { timeAgo, stripHtml, hnUrl, formatNumber } from '../utils/format.js';

// --- get_user ---

const getUserSchema = z.object({
  username: z.string({ required_error: 'username is required' }).min(1),
});

export const getUserDefinition = {
  name: 'get_user',
  description: 'Get a Hacker News user profile by username. Returns karma, account age, about text, and submission count.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      username: {
        type: 'string',
        description: 'The HN username',
      },
    },
    required: ['username'],
  },
};

export async function getUser(client: HNClient, args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const params = getUserSchema.parse(args);
    const user = await client.getUser(params.username);

    if (!user) {
      throw new McpError(ErrorCode.InvalidRequest, `User "${params.username}" not found`);
    }

    const lines = [
      `## ${user.id}`,
      `Karma: ${formatNumber(user.karma)}`,
      `Created: ${timeAgo(user.created)}`,
      `Submissions: ${formatNumber(user.submitted?.length ?? 0)}`,
      `Profile: https://news.ycombinator.com/user?id=${user.id}`,
    ];

    if (user.about) {
      lines.push('');
      lines.push('### About');
      lines.push(stripHtml(user.about));
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  } catch (error) {
    if (error instanceof McpError) throw error;
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : 'Unknown error');
  }
}

// --- get_user_submissions ---

const getUserSubmissionsSchema = z.object({
  username: z.string({ required_error: 'username is required' }).min(1),
  limit: z.number().min(1).max(30).default(10),
  type: z.enum(['all', 'story', 'comment']).default('all'),
});

export const getUserSubmissionsDefinition = {
  name: 'get_user_submissions',
  description: 'Get recent submissions from a Hacker News user. Can filter by stories or comments.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      username: {
        type: 'string',
        description: 'The HN username',
      },
      limit: {
        type: 'number',
        description: 'Number of submissions to return (1-30). Default: 10',
      },
      type: {
        type: 'string',
        enum: ['all', 'story', 'comment'],
        description: 'Filter by submission type. Default: all',
      },
    },
    required: ['username'],
  },
};

export async function getUserSubmissions(client: HNClient, args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const params = getUserSubmissionsSchema.parse(args);
    const user = await client.getUser(params.username);

    if (!user) {
      throw new McpError(ErrorCode.InvalidRequest, `User "${params.username}" not found`);
    }

    if (!user.submitted || user.submitted.length === 0) {
      return { content: [{ type: 'text', text: `User "${user.id}" has no submissions.` }] };
    }

    // Fetch more than needed to account for filtering
    const fetchCount = params.type === 'all' ? params.limit : params.limit * 3;
    const ids = user.submitted.slice(0, Math.min(fetchCount, 60));
    const items = await client.getItems(ids);

    const filtered = items.filter(item => {
      if (!item || item.deleted || item.dead) return false;
      if (params.type === 'all') return true;
      return item.type === params.type;
    }).slice(0, params.limit);

    const lines: string[] = [
      `## Submissions by ${user.id} (${params.type})`,
      '',
    ];

    for (const item of filtered) {
      if (!item) continue;
      const age = item.time ? timeAgo(item.time) : '';

      if (item.type === 'story' || item.type === 'job') {
        lines.push(`**${item.title || '(untitled)'}**`);
        if (item.url) lines.push(`  ${item.url}`);
        lines.push(`  ${formatNumber(item.score ?? 0)} points | ${age} | ${formatNumber(item.descendants ?? 0)} comments | ${hnUrl(item.id)}`);
      } else if (item.type === 'comment') {
        const text = stripHtml(item.text).slice(0, 150);
        lines.push(`**Comment** (${age})`);
        lines.push(`  ${text}${text.length >= 150 ? '...' : ''}`);
        lines.push(`  ${hnUrl(item.id)}`);
      } else {
        lines.push(`**${item.type}** (${age}) ${hnUrl(item.id)}`);
      }
      lines.push('');
    }

    if (filtered.length === 0) {
      lines.push('No matching submissions found.');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  } catch (error) {
    if (error instanceof McpError) throw error;
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : 'Unknown error');
  }
}
