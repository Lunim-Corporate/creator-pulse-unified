import { BaseScraper } from './base/BaseScraper';
import { ApiError } from '../utils/error';
import { PERPLEXITY_SCRAPER_CONFIG } from '../config/scraper.config';
import type { ScrapedPost } from './types';
import OpenAI from 'openai';

interface PerplexityConfig {
  apiKey: string;
  mode?: 'tabb' | 'lunim' | 'general';
}

interface PerplexitySearchResponse {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
}

export class PerplexityScraper extends BaseScraper {
  protected platform = 'perplexity';
  private client: OpenAI;
  private mode: 'tabb' | 'lunim' | 'general';

  constructor(config: PerplexityConfig) {
    super(PERPLEXITY_SCRAPER_CONFIG);
    
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://api.perplexity.ai'
    });
    
    this.mode = config.mode || 'tabb';
  }

  async search(query: string, limit: number = 20): Promise<ScrapedPost[]> {
    const cacheKey = `perplexity:${this.mode}:${query}:${limit}`;
    
    return this.getCached(cacheKey, async () => {
      return this.fetchWithRetry(
        () => this.searchWeb(query, limit),
        `search:${query}`
      );
    });
  }

  private async searchWeb(query: string, limit: number): Promise<ScrapedPost[]> {
    try {
      console.log(`\n→ Perplexity searching: "${query}"`);
      
      const searchPrompt = this.buildSearchPrompt(query, limit);
      
      const response = await this.client.chat.completions.create({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: searchPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        // @ts-ignore - Perplexity-specific parameter
        return_citations: true,
        return_images: false
      }) as any;

      const content = response.choices[0]?.message?.content;
      const citations = (response as any).citations || [];
      
      if (!content) {
        console.warn('Perplexity returned no content');
        return [];
      }

      const posts = this.parseResults(content, citations, query);
      
      console.log(`  ✓ Perplexity found ${posts.length} relevant discussions`);
      
      return posts.slice(0, limit);
      
    } catch (error: any) {
      if (error.status === 429) {
        console.warn('⚠️  Perplexity rate limit reached, returning empty results');
        return [];
      }
      
      throw new ApiError(
        `Perplexity search failed: ${error.message}`,
        error.status || 500,
        { query, cause: error }
      );
    }
  }

  private getSystemPrompt(): string {
    const contexts = {
      tabb: `You are a research assistant finding real creator discussions about filmmaking, video production, and creator workflows.

Focus on:
- YouTube creators, filmmakers, videographers discussing their workflows
- Production challenges, collaboration issues, tool discussions
- Reddit posts from r/Filmmakers, r/VideoEditing, r/videography
- Industry forums and creator communities
- Real people sharing experiences, not promotional content

Return ONLY genuine creator discussions with real sources.`,
      
      lunim: `You are a research assistant finding real discussions about creative technology, AI tools, and design innovation.

Focus on:
- Designers, developers, creative technologists sharing experiences
- AI tool discussions, workflow automation, digital transformation
- Reddit posts from r/Design, r/MachineLearning, r/webdev
- Tech communities and design forums
- Real people discussing tools, challenges, and innovations

Return ONLY genuine discussions with real sources.`,


      general: `You are a research assistant finding real creator discussions across various topics and platforms.

Focus on:
- Content creators, influencers, and digital professionals sharing experiences
- Cross-platform trends, tools, and workflows
- Broad audience interests including YouTube, Reddit, Facebook communities
- Real people discussing creative work, challenges, and solutions
- Industry discussions and community insights

Return ONLY genuine creator discussions with real sources.`
    };

    return contexts[this.mode];
  }

private buildSearchPrompt(query: string, limit: number): string {
  return `Find ${limit} recent real discussions about: ${query}

Requirements:
1. Only include discussions from the last 6 months
2. Prioritize Reddit, YouTube videos, forums, and creator communities
3. Focus on people sharing genuine experiences, questions, or pain points
4. Include the source URL for each discussion
5. Avoid promotional content, ads, or marketing materials
6. For YouTube results, include actual video titles and URLs

For each discussion found, provide:
- Source platform (Reddit, YouTube, Forum, etc.)
- Creator/Author handle or username
- Discussion title or topic
- Key excerpt (2-3 sentences of what they're saying)
- Direct link to the discussion
- Date posted
- Engagement metrics if available (upvotes, comments, views)

Format as JSON array:
[
  {
    "platform": "youtube",
    "author": "channel_name",
    "title": "Exact video title",
    "excerpt": "What they discussed in the video...",
    "url": "https://youtube.com/watch?v=...",
    "date": "2024-01-15",
    "engagement": { "views": 125000, "likes": 5400, "comments": 234 }
  }
]

CRITICAL: Use real URLs. For YouTube, use actual video links. For Reddit, use actual post links.

Search now and return ONLY the JSON array.`;
}

  private parseResults(content: string, citations: string[], query: string): ScrapedPost[] {
    const posts: ScrapedPost[] = [];

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) {
        return this.parseFromCitations(content, citations, query);
      }

      const results = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(results)) {
        console.warn('Perplexity returned non-array results');
        return this.parseFromCitations(content, citations, query);
      }

      results.forEach((result: any, index: number) => {
        try {
        const post: ScrapedPost = {
          id: `perplexity-${Date.now()}-${index}`,
          platform: this.normalizePlatform(result.platform),
          creator_handle: result.author || 'Unknown',
          content: `${result.title || ''}\n\n${result.excerpt || result.content || ''}`,
          post_link: result.url || citations[index] || '#',
          timestamp: result.date || new Date().toISOString(),
          engagement: {
            likes: result.engagement?.upvotes || result.engagement?.likes || 0,
            comments: result.engagement?.comments || 0,
            views: result.engagement?.views || 0
          },
          metadata: {
            source: 'perplexity',  
            query,
            verified: true,
            originalPlatform: result.platform,  
            scrapedAt: new Date().toISOString()
          }
          };

          posts.push(post);
        } catch (parseError) {
          console.warn('Failed to parse Perplexity result:', parseError);
        }
      });

    } catch (error) {
      console.warn('Failed to parse Perplexity JSON, using fallback:', error);
      return this.parseFromCitations(content, citations, query);
    }

    return posts;
  }

 private parseFromCitations(content: string, citations: string[], query: string): ScrapedPost[] {
  const posts: ScrapedPost[] = [];
  const sections = content.split(/\n\n+/);
  
  sections.forEach((section, index) => {
    if (section.trim().length < 50) return;
    
    const citation = citations[index] || citations[0] || '#';
    const detectedPlatform = this.detectPlatformFromUrl(citation);
    
    const post: ScrapedPost = {
      id: `perplexity-web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      platform: detectedPlatform,  
      creator_handle: this.extractHandleFromUrl(citation) || 'Web Discussion',
      content: section.trim(),
      post_link: citation,
      timestamp: new Date().toISOString(),
      engagement: {},
      metadata: {
        source: 'perplexity',  
        query,
        verified: true,
        parsedFromCitations: true,
        isWebScrape: true,
        originalPlatform: detectedPlatform,  
        scrapedAt: new Date().toISOString()
      }
    };

    posts.push(post);
  });

  return posts.slice(0, 15);
}

  private normalizePlatform(platform: string): 'reddit' | 'youtube' | 'facebook' {
    const p = platform.toLowerCase();
    
    if (p.includes('reddit')) return 'reddit';
    if (p.includes('youtube') || p.includes('yt')) return 'youtube';
    if (p.includes('facebook') || p.includes('fb')) return 'facebook';
    
    return 'reddit';
  }

  private detectPlatformFromUrl(url: string): 'reddit' | 'youtube' | 'facebook' {
    const u = url.toLowerCase();
    
    if (u.includes('reddit.com')) return 'reddit';
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    if (u.includes('facebook.com')) return 'facebook';
    
    return 'reddit'; 
  }

  private extractHandleFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      
      if (url.includes('reddit.com')) {
        const match = url.match(/\/u\/([^\/\?]+)|\/r\/([^\/\?]+)/);
        return match ? (match[1] || match[2]) : null;
      }
      
      if (url.includes('youtube.com')) {
        const match = url.match(/\/@([^\/\?]+)|\/user\/([^\/\?]+)|\/channel\/([^\/\?]+)/);
        return match ? (match[1] || match[2] || match[3]) : null;
      }
      
      return urlObj.hostname.replace('www.', '');
      
    } catch {
      return null;
    }
  }
}

export type { PerplexityConfig };