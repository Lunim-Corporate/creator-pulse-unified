export interface ScraperConfig {
  rateLimit: {
    requestsPerMinute: number;
  };
  cache: {
    ttlMinutes: number;
    maxEntries: number;
  };
  retry: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
}

export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
  rateLimit: {
    requestsPerMinute: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60')
  },
  cache: {
    ttlMinutes: parseInt(process.env.CACHE_TTL_MINUTES || '30'),
    maxEntries: 200
  },
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  }
};

export const YOUTUBE_CONFIG: ScraperConfig = {
  ...DEFAULT_SCRAPER_CONFIG,
  rateLimit: {
    requestsPerMinute: 100 
  }
};

export const REDDIT_CONFIG: ScraperConfig = {
  ...DEFAULT_SCRAPER_CONFIG,
  rateLimit: {
    requestsPerMinute: 60 
  }
};

export const FACEBOOK_CONFIG: ScraperConfig = {
  ...DEFAULT_SCRAPER_CONFIG,
  rateLimit: {
    requestsPerMinute: 200 
  }
};

export const PERPLEXITY_SCRAPER_CONFIG: ScraperConfig = {
  ...DEFAULT_SCRAPER_CONFIG,
  rateLimit: {
    requestsPerMinute: 20 
  },
  cache: {
    ttlMinutes: 60, 
    maxEntries: 100
  },
  retry: {
    maxRetries: 2, 
    baseDelay: 2000,
    maxDelay: 8000
  }
};