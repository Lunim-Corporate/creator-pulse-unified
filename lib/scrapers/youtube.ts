import { BaseScraper } from './base/BaseScraper';
import { ApiError } from '../utils/error';
import { YOUTUBE_CONFIG } from '../config/scraper.config';
import type { ScrapedPost } from './types';

interface YoutubeConfig {
  apiKey: string;
}

interface YoutubeSearchResult {
  id: { videoId: string; channelId: string };
  snippet: {
    publishedAt: string;
    channelTitle: string;
    title: string;
    description: string;
    thumbnails: any;
  };
}

interface YoutubeVideoStats {
  statistics: {
    viewCount: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails: {
    duration: string;
  };
}

export class YoutubeScraper extends BaseScraper {
  protected platform = 'youtube';
  private apiKey: string;

  constructor(config: YoutubeConfig) {
    super(YOUTUBE_CONFIG);
    this.apiKey = config.apiKey;
  }

  async search(query: string, limit: number = 25): Promise<ScrapedPost[]> {
    const cacheKey = `yt:${query}:${limit}`;
    
    return this.getCached(cacheKey, async () => {
      return this.fetchWithRetry(
        () => this.searchVideos(query, limit),
        `search:${query}`
      );
    });
  }

  private async searchVideos(query: string, limit: number): Promise<ScrapedPost[]> {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('maxResults', Math.min(limit, 50).toString());
    searchUrl.searchParams.set('key', this.apiKey);

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        `YouTube API error: ${response.statusText}`,
        response.status,
        error
      );
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.warn(`No YouTube results for query: ${query}`);
      return [];
    }

    const videoIds = data.items.map((item: YoutubeSearchResult) => item.id.videoId);
    const statsMap = await this.batchFetchStats(videoIds);

    return this.transformResults(data.items, statsMap);
  }

  private async batchFetchStats(videoIds: string[]): Promise<Map<string, YoutubeVideoStats>> {
    const statsMap = new Map<string, YoutubeVideoStats>();
    
    const chunks = this.chunkArray(videoIds, 50);
    
    await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const url = new URL('https://www.googleapis.com/youtube/v3/videos');
          url.searchParams.set('part', 'statistics,contentDetails');
          url.searchParams.set('id', chunk.join(','));
          url.searchParams.set('key', this.apiKey);

          const response = await fetch(url.toString());
          
          if (!response.ok) {
            console.error(`Failed to fetch stats for chunk: ${response.statusText}`);
            return;
          }

          const data = await response.json();
          
          data.items?.forEach((item: any) => {
            statsMap.set(item.id, item);
          });
        } catch (error) {
          console.error('Error fetching video stats:', error);
        }
      })
    );

    return statsMap;
  }

  private transformResults(
    items: YoutubeSearchResult[],
    stats: Map<string, YoutubeVideoStats>
  ): ScrapedPost[] {
    return items.map(item => {
      const videoId = item.id.videoId;
      const videoStats = stats.get(videoId);

      const post: ScrapedPost = {
        id: videoId,
        platform: 'youtube' as const,
        creator_handle: item.snippet.channelTitle,
        content: `${item.snippet.title}\n\n${item.snippet.description}`,
        post_link: `https://youtube.com/watch?v=${videoId}`,
        timestamp: item.snippet.publishedAt,
        engagement: {
          likes: parseInt(videoStats?.statistics.likeCount || '0'),
          comments: parseInt(videoStats?.statistics.commentCount || '0'),
          views: parseInt(videoStats?.statistics.viewCount || '0')
        },
        metadata: {
          channelId: item.id.channelId,
          thumbnails: item.snippet.thumbnails,
          duration: videoStats?.contentDetails.duration
        }
      };

      return post;
    });
  }

  async searchChannelVideos(channelId: string, limit: number = 10): Promise<ScrapedPost[]> {
    const cacheKey = `yt:channel:${channelId}:${limit}`;
    
    return this.getCached(cacheKey, async () => {
      return this.fetchWithRetry(
        async () => {
          const url = new URL('https://www.googleapis.com/youtube/v3/search');
          url.searchParams.set('part', 'snippet');
          url.searchParams.set('channelId', channelId);
          url.searchParams.set('type', 'video');
          url.searchParams.set('order', 'date');
          url.searchParams.set('maxResults', limit.toString());
          url.searchParams.set('key', this.apiKey);

          const response = await fetch(url.toString());
          
          if (!response.ok) {
            throw new ApiError(
              `YouTube API error: ${response.statusText}`,
              response.status
            );
          }

          const data = await response.json();
          const videoIds = data.items.map((item: any) => item.id.videoId);
          const statsMap = await this.batchFetchStats(videoIds);
          
          return this.transformResults(data.items, statsMap);
        },
        `channel:${channelId}`
      );
    });
  }
}

export type { YoutubeConfig };