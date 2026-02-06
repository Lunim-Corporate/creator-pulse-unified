
import { YoutubeScraper } from './youtube';
import { RedditScraper } from './reddit';
import { RedditRSSScraper } from './reddit-rss';
import { FacebookScraper } from './facebook';
import { FacebookPublicScraper } from './facebook-public';
import { PerplexityScraper } from './perplexity';
import { API_CONFIG } from '../config/api.config';
import type { BaseScraper } from './base/BaseScraper';
import type { ScrapedPost } from './types';

export type Platform = 'youtube' | 'reddit' | 'facebook' | 'perplexity';

export interface ScraperStats {
  platform: Platform;
  available: boolean;
  method: 'api' | 'rss' | 'public' | 'mock' | 'ai';
  configured: boolean;
  lastUsed?: Date;
  successRate?: number;
}

export class ScraperFactory {
  private scrapers = new Map<Platform, BaseScraper>();
  private stats = new Map<Platform, ScraperStats>();
  private mode: 'tabb' | 'lunim' | 'general' = 'tabb';

  constructor(mode?: 'tabb' | 'lunim' | 'general') {
    this.mode = mode || 'general';
    this.initializeScrapers();
  }

  private initializeScrapers() {
    if (API_CONFIG.youtube.apiKey) {
      this.scrapers.set('youtube', new YoutubeScraper({
        apiKey: API_CONFIG.youtube.apiKey
      }));
      this.stats.set('youtube', {
        platform: 'youtube',
        available: true,
        method: 'api',
        configured: true
      });
    }

    if (API_CONFIG.reddit.enabled) {
      this.scrapers.set('reddit', new RedditScraper({
        clientId: API_CONFIG.reddit.clientId,
        clientSecret: API_CONFIG.reddit.clientSecret,
        username: API_CONFIG.reddit.username,
        password: API_CONFIG.reddit.password
      }));
      this.stats.set('reddit', {
        platform: 'reddit',
        available: true,
        method: 'api',
        configured: true
      });
    } else {
      console.log('Reddit API not configured, using RSS fallback');
      this.scrapers.set('reddit', new RedditRSSScraper({
        subreddits: ['Filmmakers', 'VideoEditing', 'Videography', 'cinematography']
      }));
      this.stats.set('reddit', {
        platform: 'reddit',
        available: true,
        method: 'rss',
        configured: false
      });
    }

    if (API_CONFIG.facebook.enabled) {
      this.scrapers.set('facebook', new FacebookScraper({
        accessToken: API_CONFIG.facebook.accessToken
      }));
      this.stats.set('facebook', {
        platform: 'facebook',
        available: true,
        method: 'api',
        configured: true
      });
    } else {
      console.log(' Facebook API not configured, using public scraper (limited)');
      this.scrapers.set('facebook', new FacebookPublicScraper({
        pages: []
      }));
      this.stats.set('facebook', {
        platform: 'facebook',
        available: true,
        method: 'public',
        configured: false
      });
    }

    if (API_CONFIG.perplexity.enabled) {
      console.log(' Perplexity scraper enabled - will enhance data collection');
      this.scrapers.set('perplexity', new PerplexityScraper({
        apiKey: API_CONFIG.perplexity.apiKey,
        mode: this.mode
      }));
      this.stats.set('perplexity', {
        platform: 'perplexity',
        available: true,
        method: 'ai',
        configured: true
      });
    } else {
      console.log('  Perplexity API not configured - skipping AI scraping');
    }
  }

  getScraper(platform: Platform): BaseScraper | null {
    return this.scrapers.get(platform) || null;
  }

  getStats(platform: Platform): ScraperStats | null {
    return this.stats.get(platform) || null;
  }

  getAllStats(): Map<Platform, ScraperStats> {
    return new Map(this.stats);
  }

  async scrapeAll(
    queries: { 
      youtube?: string[]; 
      reddit?: string[]; 
      facebook?: string[];
      perplexity?: string[]; 
    }
  ): Promise<{
    posts: ScrapedPost[];
    failures: string[];
    stats: Record<Platform, { count: number; method: string }>;
  }> {
    const posts: ScrapedPost[] = [];
    const failures: string[] = [];
    const platformStats: Record<Platform, { count: number; method: string }> = {
      youtube: { count: 0, method: 'none' },
      reddit: { count: 0, method: 'none' },
      facebook: { count: 0, method: 'none' },
      perplexity: { count: 0, method: 'none' }
    };

    const scrapePromises: Promise<void>[] = [];

    if (queries.youtube?.length) {
      scrapePromises.push(
        this.scrapeYouTube(queries.youtube, posts, platformStats, failures)
      );
    }

    if (queries.reddit?.length) {
      scrapePromises.push(
        this.scrapeReddit(queries.reddit, posts, platformStats, failures)
      );
    }

    if (queries.facebook?.length) {
      scrapePromises.push(
        this.scrapeFacebook(queries.facebook, posts, platformStats, failures)
      );
    }

    if (queries.perplexity?.length || (queries.youtube?.length && this.stats.get('perplexity')?.available)) {
      const perplexityQueries = queries.perplexity || queries.youtube || [];
      scrapePromises.push(
        this.scrapePerplexity(perplexityQueries, posts, platformStats, failures)
      );
    }

    await Promise.allSettled(scrapePromises);

    const deduplicatedPosts = this.deduplicateAndMerge(posts);

    console.log('\n' + '='.repeat(60));
    console.log('SCRAPING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total unique posts: ${deduplicatedPosts.length}`);
    console.log(`YouTube: ${platformStats.youtube.count} posts (${platformStats.youtube.method})`);
    console.log(`Reddit: ${platformStats.reddit.count} posts (${platformStats.reddit.method})`);
    console.log(`Facebook: ${platformStats.facebook.count} posts (${platformStats.facebook.method})`);
    console.log(`Perplexity: ${platformStats.perplexity.count} posts (${platformStats.perplexity.method})`);
    
    if (failures.length > 0) {
      console.log(`Failures: ${failures.join(', ')}`);
    }
    
    console.log('='.repeat(60) + '\n');

    return {
      posts: deduplicatedPosts,
      failures,
      stats: platformStats
    };
  }

  private async scrapeYouTube(
    queries: string[],
    posts: ScrapedPost[],
    stats: Record<Platform, { count: number; method: string }>,
    failures: string[]
  ): Promise<void> {
    const scraper = this.getScraper('youtube');
    const scraperStats = this.getStats('youtube');
    
    if (scraper && scraperStats?.available) {
      try {
        console.log('\n→ Scraping YouTube...');
        for (const query of queries) {
          const results = await scraper.search(query, 25);
          results.forEach(p => {
            p.metadata = { ...p.metadata, source: 'youtube' };
            p._sources = ['youtube'];
          });
          posts.push(...results);
          stats.youtube.count += results.length;
          console.log(`  ✓ "${query}": ${results.length} videos`);
        }
        stats.youtube.method = scraperStats.method;
        console.log(`✓ YouTube complete: ${stats.youtube.count} total videos`);
      } catch (error) {
        console.error('✗ YouTube scraping failed:', error);
        failures.push('YouTube');
      }
    }
  }

  private async scrapeReddit(
    queries: string[],
    posts: ScrapedPost[],
    stats: Record<Platform, { count: number; method: string }>,
    failures: string[]
  ): Promise<void> {
    const scraper = this.getScraper('reddit');
    const scraperStats = this.getStats('reddit');
    
    if (scraper && scraperStats?.available) {
      try {
        console.log('\n→ Scraping Reddit...');
        for (const query of queries) {
          try {
            const results = await scraper.search(query, 20);
            results.forEach(p => {
              p.metadata = { ...p.metadata, source: 'reddit' };
              p._sources = ['reddit'];
            });
            posts.push(...results);
            stats.reddit.count += results.length;
            console.log(`  ✓ "${query}": ${results.length} posts`);
          } catch (queryError) {
            console.error(`  ✗ Query "${query}" failed:`, queryError);
          }
        }
        stats.reddit.method = scraperStats.method;
        console.log(`✓ Reddit complete: ${stats.reddit.count} total posts`);
      } catch (error) {
        console.error('✗ Reddit scraping failed:', error);
        failures.push('Reddit');
      }
    }
  }

  private async scrapeFacebook(
    queries: string[],
    posts: ScrapedPost[],
    stats: Record<Platform, { count: number; method: string }>,
    failures: string[]
  ): Promise<void> {
    const scraper = this.getScraper('facebook');
    const scraperStats = this.getStats('facebook');
    
    if (scraper && scraperStats?.available) {
      try {
        console.log('\n→ Scraping Facebook...');
        for (const query of queries) {
          const results = await scraper.search(query, 10);
          results.forEach(p => {
            p.metadata = { ...p.metadata, source: 'facebook' };
            p._sources = ['facebook'];
          });
          posts.push(...results);
          stats.facebook.count += results.length;
          console.log(`  ✓ "${query}": ${results.length} posts`);
        }
        stats.facebook.method = scraperStats.method;
        console.log(`✓ Facebook complete: ${stats.facebook.count} posts`);
      } catch (error) {
        console.error('✗ Facebook scraping failed:', error);
        failures.push('Facebook');
      }
    }
  }

  private async scrapePerplexity(
    queries: string[],
    posts: ScrapedPost[],
    stats: Record<Platform, { count: number; method: string }>,
    failures: string[]
  ): Promise<void> {
    const scraper = this.getScraper('perplexity');
    const scraperStats = this.getStats('perplexity');
    
    if (scraper && scraperStats?.available) {
      try {
        console.log('\n→ Scraping with Perplexity AI...');
        for (const query of queries) {
          try {
            const results = await scraper.search(query, 15);
            results.forEach(p => {
              p.metadata = { ...p.metadata, source: 'perplexity', verified: true };
              p._sources = ['perplexity'];
            });
            posts.push(...results);
            stats.perplexity.count += results.length;
            console.log(`  ✓ "${query}": ${results.length} AI-sourced posts`);
          } catch (queryError) {
            console.error(`  ✗ Perplexity query "${query}" failed:`, queryError);
          }
        }
        stats.perplexity.method = 'ai';
        console.log(`✓ Perplexity complete: ${stats.perplexity.count} total posts`);
      } catch (error) {
        console.error('✗ Perplexity scraping failed:', error);
        failures.push('Perplexity');
      }
    }
  }

  private deduplicateAndMerge(posts: ScrapedPost[]): ScrapedPost[] {
    const postMap = new Map<string, ScrapedPost>();

    for (const post of posts) {
      const contentKey = this.generateContentKey(post);
      
      if (postMap.has(contentKey)) {
        const existing = postMap.get(contentKey)!;
        existing._sources = [...(existing._sources || []), ...(post._sources || [])];
        
        if (post.metadata?.source === 'perplexity' && !existing.metadata?.verified) {
          existing.metadata = { ...existing.metadata, verified: true };
        }
        
        if (post.engagement) {
          existing.engagement = {
            likes: Math.max(existing.engagement?.likes || 0, post.engagement.likes || 0),
            comments: Math.max(existing.engagement?.comments || 0, post.engagement.comments || 0),
            views: Math.max(existing.engagement?.views || 0, post.engagement.views || 0)
          };
        }
        
        existing._qualityScore = this.calculateQualityScore(existing);
      } else {
        post._qualityScore = this.calculateQualityScore(post);
        postMap.set(contentKey, post);
      }
    }

    return Array.from(postMap.values())
      .sort((a, b) => (b._qualityScore || 0) - (a._qualityScore || 0));
  }

private generateContentKey(post: ScrapedPost): string {
  const normalized = post.content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .slice(0, 200);
  
  const sourceIdentifier = post.metadata?.source === 'perplexity' 
    ? 'perplexity'  
    : post.platform; 
  
  return `${sourceIdentifier}:${post.creator_handle}:${normalized}`;
}

  private calculateQualityScore(post: ScrapedPost): number {
    let score = 50;

    if (post.metadata?.verified || post._sources?.includes('perplexity')) {
      score += 30;
    }

    if (post._sources && post._sources.length > 1) {
      score += 20;
    }

    const eng = post.engagement || {};
    if (eng.likes && eng.likes > 50) score += 10;
    if (eng.comments && eng.comments > 10) score += 10;
    if (eng.views && eng.views > 1000) score += 5;

    if (post.content.length > 200) score += 5;
    if (post.content.includes('?')) score += 5; 

    return Math.min(score, 100);
  }

  getStatusReport(): string {
    const lines: string[] = [
      '\n' + '='.repeat(60),
      'SCRAPER STATUS REPORT',
      '='.repeat(60)
    ];

    for (const [platform, stats] of this.stats.entries()) {
      const icon = stats.available ? '✓' : '✗';
      const status = stats.configured ? 'API' : stats.method.toUpperCase();
      
      lines.push(`${icon} ${platform.toUpperCase().padEnd(12)} | ${status.padEnd(8)} | ${stats.available ? 'Available' : 'Unavailable'}`);
      
      if (!stats.configured && stats.available) {
        lines.push(`  └─ Using fallback method (${stats.method})`);
      }
      
      if (platform === 'perplexity' && stats.available) {
        lines.push(`  🚀 AI-powered web scraping enabled`);
      }
    }

    lines.push('='.repeat(60) + '\n');
    return lines.join('\n');
  }
}

let factoryInstance: ScraperFactory | null = null;

export function getScraperFactory(mode?: 'tabb' | 'lunim' | 'general'): ScraperFactory {
  if (!factoryInstance || (mode && factoryInstance['mode'] !== mode)) {
    factoryInstance = new ScraperFactory(mode);
  }
  return factoryInstance;
}