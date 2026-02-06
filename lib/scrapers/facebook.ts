import { BaseScraper } from './base/BaseScraper';
import { FACEBOOK_CONFIG } from '../config/scraper.config';
import type { ScrapedPost } from "./types";

export interface FacebookConfig {
  accessToken: string;
}

interface FacebookPost {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  permalink_url: string;
  shares?: { summary: { total_count: number } };
  likes?: { summary: { total_count: number } };
  comments?: { summary: { total_count: number } };
}

interface FacebookResponse {
  data: FacebookPost[];
}

interface FacebookPageInfo {
  name: string;
}

export class FacebookScraper extends BaseScraper {
  protected platform = 'facebook';
  private config: FacebookConfig;

  constructor(config: FacebookConfig) {
    super(FACEBOOK_CONFIG);
    this.config = config;
  }

  async search(pageId: string, limit: number = 10): Promise<ScrapedPost[]> {
    const cacheKey = `facebook:${pageId}:${limit}`;
    
    return this.getCached(cacheKey, async () => {
      return this.fetchWithRetry(
        () => this.searchPosts(pageId, limit),
        `page:${pageId}`
      );
    });
  }

  private async searchPosts(pageId: string, limit: number = 10): Promise<ScrapedPost[]> {
    try {
      const pageInfoRes = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}?fields=name&access_token=${this.config.accessToken}`
      );

      if (!pageInfoRes.ok) {
        console.warn("Facebook page info failed:", pageId);
        return [];
      }

      const pageInfo = (await pageInfoRes.json()) as FacebookPageInfo;

      const res = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/posts?fields=message,story,created_time,permalink_url,shares.summary(true),likes.summary(true),comments.summary(true)&limit=${limit}&access_token=${this.config.accessToken}`
      );

      if (!res.ok) {
        console.warn("Facebook posts fetch failed:", pageId);
        return [];
      }

      const data = (await res.json()) as FacebookResponse;

      return data.data.map((post) => ({
        id: post.id,
        platform: "facebook" as const,
        creator_handle: pageInfo.name,
        content: post.message || post.story || "(No content)",
        post_link: post.permalink_url,
        timestamp: post.created_time,
        engagement: {
          likes: post.likes?.summary.total_count ?? 0,
          comments: post.comments?.summary.total_count ?? 0,
          shares: post.shares?.summary.total_count ?? 0,
        },
        metadata: {
          pageId
        }
      }));
    } catch (err) {
      console.warn("Facebook scraping skipped:", err);
      return [];
    }
  }
}