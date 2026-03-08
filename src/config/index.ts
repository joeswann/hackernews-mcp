import { config } from 'dotenv';
import { z } from 'zod';

const originalWrite = process.stdout.write;
process.stdout.write = () => true;
config();
process.stdout.write = originalWrite;

const configSchema = z.object({
  HN_API_BASE_URL: z.string().url().default('https://hacker-news.firebaseio.com/v0'),
  HN_ALGOLIA_BASE_URL: z.string().url().default('https://hn.algolia.com/api/v1'),
  HN_USERNAME: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

export function getConfig(): Config {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Configuration validation failed:', result.error.format());
    throw new Error('Invalid configuration.');
  }
  return result.data;
}
