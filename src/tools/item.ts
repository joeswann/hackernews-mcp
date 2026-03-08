import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { HNClient } from '../api/client.js';
import { timeAgo, stripHtml, hnUrl, formatNumber } from '../utils/format.js';

const getItemSchema = z.object({
  id: z.number({ required_error: 'id is required' }),
});

export const getItemDefinition = {
  name: 'get_item',
  description: 'Get any Hacker News item by ID (story, comment, job, poll). Returns full details including text content.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'number',
        description: 'The HN item ID',
      },
    },
    required: ['id'],
  },
};

export async function getItem(client: HNClient, args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const params = getItemSchema.parse(args);
    const item = await client.getItem(params.id);

    if (!item) {
      throw new McpError(ErrorCode.InvalidRequest, `Item ${params.id} not found`);
    }

    const lines: string[] = [];
    const age = item.time ? timeAgo(item.time) : '';

    if (item.type === 'story' || item.type === 'job') {
      lines.push(`## ${item.title || '(untitled)'}`);
      lines.push(`Type: ${item.type} | By: ${item.by || 'unknown'} | ${age}`);
      if (item.url) lines.push(`URL: ${item.url}`);
      lines.push(`HN: ${hnUrl(item.id)}`);
      if (item.score !== undefined) lines.push(`Score: ${formatNumber(item.score)} points`);
      if (item.descendants !== undefined) lines.push(`Comments: ${formatNumber(item.descendants)}`);
      if (item.text) {
        lines.push('');
        lines.push(stripHtml(item.text));
      }
    } else if (item.type === 'comment') {
      lines.push(`## Comment by ${item.by || 'unknown'} (${age})`);
      lines.push(`HN: ${hnUrl(item.id)}`);
      if (item.parent) lines.push(`Parent: ${hnUrl(item.parent)}`);
      lines.push('');
      lines.push(stripHtml(item.text));
    } else if (item.type === 'poll') {
      lines.push(`## Poll: ${item.title || '(untitled)'}`);
      lines.push(`By: ${item.by || 'unknown'} | ${age}`);
      lines.push(`HN: ${hnUrl(item.id)}`);
      if (item.score !== undefined) lines.push(`Score: ${formatNumber(item.score)} points`);
      if (item.text) {
        lines.push('');
        lines.push(stripHtml(item.text));
      }
      if (item.parts && item.parts.length > 0) {
        lines.push('');
        lines.push(`Poll options: ${item.parts.length}`);
      }
    } else {
      lines.push(`## Item ${item.id} (${item.type})`);
      lines.push(`By: ${item.by || 'unknown'} | ${age}`);
      lines.push(`HN: ${hnUrl(item.id)}`);
      if (item.text) {
        lines.push('');
        lines.push(stripHtml(item.text));
      }
    }

    if (item.kids && item.kids.length > 0) {
      lines.push('');
      lines.push(`Direct replies: ${item.kids.length}`);
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
