export type HNItemType = 'job' | 'story' | 'comment' | 'poll' | 'pollopt';

export type HNItem = {
  id: number;
  type: HNItemType;
  by?: string;
  time?: number;
  text?: string;
  dead?: boolean;
  deleted?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
};

export type HNUser = {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
};

export type AlgoliaHit = {
  objectID: string;
  title?: string;
  url?: string;
  author: string;
  points?: number;
  story_text?: string;
  comment_text?: string;
  num_comments?: number;
  story_id?: number;
  story_title?: string;
  story_url?: string;
  parent_id?: number;
  created_at: string;
  created_at_i: number;
  _tags: string[];
};

export type AlgoliaResponse = {
  hits: AlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
};

export type Feed = 'top' | 'new' | 'best' | 'ask' | 'show' | 'job';
