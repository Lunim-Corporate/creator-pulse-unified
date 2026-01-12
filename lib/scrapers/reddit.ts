import { BaseScraper } from './base/BaseScraper';
import { REDDIT_CONFIG } from '../config/scraper.config';
import type { ScrapedPost } from './types';

const REDDIT_API_BASE = 'https://oauth.reddit.com';

export interface RedditConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

interface RedditAuthResponse {
  access_token: string;
  token_type: string;
}

interface RedditPostData {
  id: string;
  author: string;
  title: string;
  selftext: string;
  url: string;
  created_utc: number;
  score: number;
  num_comments: number;
  permalink: string;
}

interface RedditApiResponse {
  data: {
    children: Array<{
      data: RedditPostData;
    }>;
  };
}

export class RedditScraper extends BaseScraper {
  protected platform = 'reddit';
  private config: RedditConfig;
  private accessToken: string = '';
  private tokenExpiry: number = 0;

  constructor(config: RedditConfig) {
    super(REDDIT_CONFIG);
    this.config = config;
  }

  async search(query: string, limit: number = 50): Promise<ScrapedPost[]> {
    const cacheKey = `reddit:${query}:${limit}`;
    
    return this.getCached(cacheKey, async () => {
      return this.fetchWithRetry(
        () => this.searchPosts(query, limit),
        `search:${query}`
      );
    });
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64');

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'FilmakerInsights/1.0',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: this.config.username,
        password: this.config.password,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Reddit auth failed: ${response.statusText}`);
    }

    const data = (await response.json()) as RedditAuthResponse;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + 3600000; // 1 hour

    return this.accessToken;
  }

  private async searchPosts(query: string, limit: number = 50): Promise<ScrapedPost[]> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${REDDIT_API_BASE}/r/Filmmakers/search?q=${encodeURIComponent(query)}&sort=new&limit=${limit}&t=week`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'FilmakerInsights/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.statusText}`);
    }

    const data = (await response.json()) as RedditApiResponse;

    return data.data.children.map((item) => {
      const post = item.data;
      return {
        id: post.id,
        platform: 'reddit' as const,
        creator_handle: post.author,
        content: `${post.title}\n\n${post.selftext}`,
        post_link: `https://reddit.com${post.permalink}`,
        timestamp: new Date(post.created_utc * 1000).toISOString(),
        engagement: {
          likes: post.score,
          comments: post.num_comments,
        },
        metadata: {
          subreddit: 'Filmmakers'
        }
      };
    });
  }
}