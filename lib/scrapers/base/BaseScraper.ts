import { RateLimiter } from './RateLimiter';
import { ScraperCache } from './ScraperCache';
import { ScraperError, ApiError } from '../../utils/error';
import type { ScrapedPost } from '../types';
import type { ScraperConfig } from '../../config/scraper.config';

export abstract class BaseScraper {
  protected abstract platform: string;
  protected rateLimiter: RateLimiter;
  protected cache: ScraperCache;
  protected retryConfig: ScraperConfig['retry'];

  constructor(config: ScraperConfig) {
    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.cache = new ScraperCache(config.cache);
    this.retryConfig = config.retry;
  }

  abstract search(query: string, limit?: number): Promise<ScrapedPost[]>;

  protected async fetchWithRetry<T>(
    fetcher: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        await this.rateLimiter.waitForSlot();
        return await fetcher();
      } catch (error) {
        lastError = error as Error;
        
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }

        const delay = this.calculateBackoff(attempt);
        console.warn(
          `${this.platform} retry ${attempt + 1}/${this.retryConfig.maxRetries} ` +
          `after ${delay}ms for ${context}`
        );
        await this.sleep(delay);
      }
    }

    throw new ScraperError(
      `${this.platform} failed after ${this.retryConfig.maxRetries} retries: ${context}`,
      { cause: lastError, context }
    );
  }

  protected shouldRetry(error: any, attempt: number): boolean {
    const status = error?.status || error?.statusCode;
    if (status === 400 || status === 401 || status === 403 || status === 404) {
      return false;
    }

    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }

    return true;
  }

  protected calculateBackoff(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(2, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected async getCached<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    await this.cache.set(key, fresh);
    return fresh;
  }

  protected chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      platform: this.platform,
      cache: this.cache.getStats(),
      rateLimit: {
        queueLength: this.rateLimiter.getQueueLength()
      }
    };
  }
}