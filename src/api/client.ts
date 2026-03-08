import { Config } from '../config/index.js';
import { HNItem, HNUser, AlgoliaResponse, Feed } from './types.js';

const FEED_ENDPOINTS: Record<Feed, string> = {
  top: 'topstories',
  new: 'newstories',
  best: 'beststories',
  ask: 'askstories',
  show: 'showstories',
  job: 'jobstories',
};

const CHUNK_SIZE = 20;

export class HNClient {
  private baseUrl: string;
  private algoliaUrl: string;

  constructor(config: Config) {
    this.baseUrl = config.HN_API_BASE_URL;
    this.algoliaUrl = config.HN_ALGOLIA_BASE_URL;
  }

  private async fetch<T>(url: string): Promise<T> {
    const res = await globalThis.fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText} for ${url}`);
    }
    return res.json() as Promise<T>;
  }

  async getStoryIds(feed: Feed): Promise<number[]> {
    const endpoint = FEED_ENDPOINTS[feed];
    return this.fetch<number[]>(`${this.baseUrl}/${endpoint}.json`);
  }

  async getItem(id: number): Promise<HNItem | null> {
    return this.fetch<HNItem | null>(`${this.baseUrl}/item/${id}.json`);
  }

  async getItems(ids: number[]): Promise<(HNItem | null)[]> {
    const results: (HNItem | null)[] = [];
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      const items = await Promise.all(chunk.map(id => this.getItem(id)));
      results.push(...items);
    }
    return results;
  }

  async getUser(username: string): Promise<HNUser | null> {
    return this.fetch<HNUser | null>(`${this.baseUrl}/user/${username}.json`);
  }

  async search(query: string, opts: {
    tags?: string;
    sort?: 'relevance' | 'date';
    page?: number;
    hitsPerPage?: number;
  } = {}): Promise<AlgoliaResponse> {
    const { tags, sort = 'relevance', page = 0, hitsPerPage = 20 } = opts;
    const endpoint = sort === 'date' ? 'search_by_date' : 'search';
    const params = new URLSearchParams({
      query,
      page: String(page),
      hitsPerPage: String(hitsPerPage),
    });
    if (tags) params.set('tags', tags);
    return this.fetch<AlgoliaResponse>(`${this.algoliaUrl}/${endpoint}?${params}`);
  }
}
