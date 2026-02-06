
import { BaseScraper } from './base/BaseScraper';
import { FACEBOOK_CONFIG } from '../config/scraper.config';
import type { ScrapedPost } from './types';

export interface FacebookPublicConfig {
  pages?: string[]; // List of public page URLs or IDs
  groups?: string[]; // Public group IDs
}

export class FacebookPublicScraper extends BaseScraper {
  protected platform = 'facebook';
  private config: FacebookPublicConfig;

  constructor(config: FacebookPublicConfig = {}) {
    super(FACEBOOK_CONFIG);
    this.config = {
      pages: config.pages || [],
      groups: config.groups || []
    };
  }

  async search(query: string, limit: number = 10): Promise<ScrapedPost[]> {
    console.warn(' Facebook public scraping is limited without API access');
    console.log('Attempting to fetch from configured public pages...');

    const posts: ScrapedPost[] = [];

    // Try to fetch from configured pages
    for (const pageId of this.config.pages || []) {
      try {
        const pagePosts = await this.scrapePage(pageId, limit);
        posts.push(...pagePosts);
      } catch (error) {
        console.warn(`Failed to scrape Facebook page ${pageId}:`, error);
      }
    }

    // Filter by query if posts contain relevant keywords
    const filtered = posts.filter(post => 
      post.content.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.slice(0, limit);
  }

  private async scrapePage(pageId: string, limit: number): Promise<ScrapedPost[]> {
    const cacheKey = `fb-public:${pageId}:${limit}`;
    
    return this.getCached(cacheKey, async () => {
      return this.fetchWithRetry(
        () => this.fetchPagePosts(pageId, limit),
        `page:${pageId}`
      );
    });
  }

  private async fetchPagePosts(pageId: string, limit: number): Promise<ScrapedPost[]> {
    // Method 1: Try RSS-Bridge (if you have it set up)
    // RSS-Bridge is an open-source tool that can generate RSS feeds from Facebook
    // https://github.com/RSS-Bridge/rss-bridge
    
    // Method 2: Try public Facebook pages RSS (deprecated but sometimes works)
    try {
      return await this.tryFacebookRSS(pageId, limit);
    } catch (error) {
      console.warn('Facebook RSS failed, trying alternative method');
    }

    // Method 3: Use a scraping service endpoint (if you set one up)
    try {
      return await this.tryScrapingService(pageId, limit);
    } catch (error) {
      console.warn('Scraping service failed');
    }

    // Method 4: Return mock data for development
    return this.getMockData(pageId, limit);
  }

  private async tryFacebookRSS(pageId: string, limit: number): Promise<ScrapedPost[]> {
    // Some Facebook pages still have RSS feeds at this format
    const rssUrl = `https://www.facebook.com/feeds/page.php?id=${pageId}&format=rss20`;
    
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CreatorPulse/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error('Facebook RSS not available');
    }

    const xml = await response.text();
    return this.parseRSS(xml, pageId, limit);
  }

  private async tryScrapingService(pageId: string, limit: number): Promise<ScrapedPost[]> {
    
    throw new Error('Scraping service not configured');
  }

  private parseRSS(xml: string, pageId: string, limit: number): ScrapedPost[] {
    const posts: ScrapedPost[] = [];
    
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = xml.match(itemRegex) || [];

    for (const item of items.slice(0, limit)) {
      try {
        const post = this.parseRSSItem(item, pageId);
        if (post) posts.push(post);
      } catch (error) {
        console.warn('Failed to parse Facebook RSS item');
      }
    }

    return posts;
  }

  private parseRSSItem(itemXml: string, pageId: string): ScrapedPost | null {
    const extractTag = (tag: string): string => {
      const match = itemXml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')) ||
                   itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return match ? this.cleanHTML(match[1]) : '';
    };

    const title = extractTag('title');
    const link = extractTag('link');
    const pubDate = extractTag('pubDate');
    const description = extractTag('description');

    if (!link) return null;

    const postIdMatch = link.match(/\/posts\/(\d+)/);
    const postId = postIdMatch ? postIdMatch[1] : this.generateId(link);

    return {
      id: postId,
      platform: 'facebook' as const,
      creator_handle: pageId,
      content: `${title}\n\n${description}`.slice(0, 1000),
      post_link: link,
      timestamp: pubDate || new Date().toISOString(),
      engagement: {
        likes: 0, 
        comments: 0,
        shares: 0
      },
      metadata: {
        channelId: pageId,
        thumbnails: [],
        pageId,
        source: 'facebook',
        scrapingMethod: 'rss', 
        isFallback: true
      }
    };
  }

  private getMockData(pageId: string, limit: number): ScrapedPost[] {
    console.warn('  Returning mock Facebook data - configure API access or scraping service for real data');
    
    return [{
      id: 'fb-mock-1',
      platform: 'facebook' as const,
      creator_handle: pageId,
      content: `[MOCK DATA] Facebook scraping requires either:
1. A valid Facebook Graph API token (set FACEBOOK_ACCESS_TOKEN in .env.local)
2. RSS-Bridge setup (https://github.com/RSS-Bridge/rss-bridge)
3. A scraping service integration (ScrapingBee, Apify, etc.)

This is mock data for development purposes. Configure one of the above methods to get real Facebook data.`,
      post_link: `https://facebook.com/${pageId}`,
      timestamp: new Date().toISOString(),
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0
      },
      metadata: {
        channelId: pageId,
        thumbnails: [],
        pageId,
        source: 'facebook',
        note: 'Configure Facebook access to get real data'
      }
    }];
  }

  private cleanHTML(text: string): string {
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  private generateId(link: string): string {
    let hash = 0;
    for (let i = 0; i < link.length; i++) {
      const char = link.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  
  setPages(pages: string[]): void {
    this.config.pages = pages;
  }

  
  addPage(pageId: string): void {
    if (!this.config.pages) this.config.pages = [];
    if (!this.config.pages.includes(pageId)) {
      this.config.pages.push(pageId);
    }
  }
}

export function extractFacebookPageId(url: string): string | null {
  const patterns = [
    /facebook\.com\/([^\/\?]+)/,
    /fb\.com\/([^\/\?]+)/,
    /\/pages\/[^\/]+\/(\d+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}