
import { BaseScraper } from './base/BaseScraper';
import { REDDIT_CONFIG } from '../config/scraper.config';
import type { ScrapedPost } from './types';

export interface RedditRSSConfig {
  subreddits?: string[]; 
  userAgent?: string;
}

interface RedditRSSItem {
  title: string;
  link: string;
  pubDate: string;
  creator: string;
  description: string;
}

export class RedditRSSScraper extends BaseScraper {
  protected platform = 'reddit';
  private config: RedditRSSConfig;

  constructor(config: RedditRSSConfig = {}) {
    super(REDDIT_CONFIG);
    this.config = {
    subreddits: config.subreddits || [
        'Filmmakers', 
        'VideoEditing', 
        'Videography', 
        'cinematography',
        'Documentaries',
        'editors',
        'colorists'
        ],
      userAgent: config.userAgent || 'Mozilla/5.0 (compatible; CreatorPulse/1.0)'
    };
  }

  async search(query: string, limit: number = 20): Promise<ScrapedPost[]> {
    const cacheKey = `reddit-rss:${query}:${limit}`;
    
    return this.getCached(cacheKey, async () => {
      return this.fetchWithRetry(
        () => this.searchSubreddits(query, limit),
        `search:${query}`
      );
    });
  }

  private async searchSubreddits(query: string, limit: number): Promise<ScrapedPost[]> {
    const allPosts: ScrapedPost[] = [];
    const postsPerSubreddit = Math.ceil(limit / this.config.subreddits!.length);

    for (const subreddit of this.config.subreddits!) {
      try {
        const posts = await this.searchSubreddit(subreddit, query, postsPerSubreddit);
        allPosts.push(...posts);
      } catch (error) {
        console.warn(`Failed to scrape r/${subreddit}:`, error);
      }
    }

    // Sort by date and limit
    return allPosts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  private async searchSubreddit(
    subreddit: string,
    query: string,
    limit: number
  ): Promise<ScrapedPost[]> {
    // Reddit RSS feed format: https://www.reddit.com/r/subreddit/search.rss?q=query&sort=new&limit=25
    const url = new URL(`https://www.reddit.com/r/${subreddit}/search.rss`);
    url.searchParams.set('q', query);
    url.searchParams.set('sort', 'new');
    url.searchParams.set('limit', Math.min(limit, 25).toString());
    url.searchParams.set('restrict_sr', 'on'); // Restrict to this subreddit

    console.log(`Fetching Reddit RSS: r/${subreddit} for "${query}"`);

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': this.config.userAgent!
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit RSS fetch failed: ${response.statusText}`);
    }

    const xml = await response.text();
    return this.parseRSS(xml, subreddit);
  }

  private parseRSS(xml: string, subreddit: string): ScrapedPost[] {
    const posts: ScrapedPost[] = [];

    // Simple XML parsing (we'll use regex for simplicity - in production, use xml2js)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = xml.match(itemRegex) || [];

    for (const item of items) {
      try {
        const post = this.parseRSSItem(item, subreddit);
        if (post) posts.push(post);
      } catch (error) {
        console.warn('Failed to parse RSS item:', error);
      }
    }

    return posts;
  }

  private parseRSSItem(itemXml: string, subreddit: string): ScrapedPost | null {
    const extractTag = (tag: string): string => {
      const match = itemXml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')) ||
                   itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return match ? this.cleanHTML(match[1]) : '';
    };

    const title = extractTag('title');
    const link = extractTag('link');
    const pubDate = extractTag('pubDate');
    const creator = extractTag('dc:creator') || extractTag('author') || 'unknown';
    const description = extractTag('description');

    if (!title || !link) return null;

    // Extract Reddit post ID from link
    const postIdMatch = link.match(/\/comments\/([a-z0-9]+)/);
    const postId = postIdMatch ? postIdMatch[1] : this.generateId(link);

    // Extract score/upvotes from description if available
    const scoreMatch = description.match(/(\d+)\s+points?/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

    const commentsMatch = description.match(/(\d+)\s+comments?/);
    const comments = commentsMatch ? parseInt(commentsMatch[1]) : 0;

    return {
      id: postId,
      platform: 'reddit' as const,
      creator_handle: creator,
      content: `${title}\n\n${this.extractTextFromDescription(description)}`,
      post_link: link,
      timestamp: pubDate || new Date().toISOString(),
      engagement: {
        likes: score,
        comments: comments
      },
      metadata: {
        channelId: subreddit, 
        thumbnails: [],       
        subreddit: subreddit,
        source: 'reddit',
        scrapingMethod: 'rss', 
        isFallback: true
      }
    };
  }

  private cleanHTML(text: string): string {
    return text
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  private extractTextFromDescription(description: string): string {
    // Remove HTML and extract meaningful text
    let text = this.cleanHTML(description);
    
    // Remove common Reddit metadata
    text = text.replace(/submitted by.*?to.*?r\/\w+/gi, '');
    text = text.replace(/\d+\s+points?/gi, '');
    text = text.replace(/\d+\s+comments?/gi, '');
    text = text.replace(/\[link\]/gi, '');
    text = text.replace(/\[comments\]/gi, '');
    
    return text.trim().slice(0, 500); // Limit length
  }

  private generateId(link: string): string {
    // Generate a simple hash from the link
    let hash = 0;
    for (let i = 0; i < link.length; i++) {
      const char = link.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  
  async getHotPosts(subreddit: string, limit: number = 25): Promise<ScrapedPost[]> {
    const cacheKey = `reddit-rss:hot:${subreddit}:${limit}`;
    
    return this.getCached(cacheKey, async () => {
      return this.fetchWithRetry(
        async () => {
          const url = `https://www.reddit.com/r/${subreddit}/hot.rss?limit=${limit}`;
          
          const response = await fetch(url, {
            headers: { 'User-Agent': this.config.userAgent! }
          });

          if (!response.ok) {
            throw new Error(`Reddit RSS fetch failed: ${response.statusText}`);
          }

          const xml = await response.text();
          return this.parseRSS(xml, subreddit);
        },
        `hot:${subreddit}`
      );
    });
  }

  
  async searchMultiple(
    subreddits: string[],
    query: string,
    limit: number = 20
  ): Promise<ScrapedPost[]> {
    const oldSubreddits = this.config.subreddits;
    this.config.subreddits = subreddits;
    
    try {
      return await this.search(query, limit);
    } finally {
      this.config.subreddits = oldSubreddits;
    }
  }
}