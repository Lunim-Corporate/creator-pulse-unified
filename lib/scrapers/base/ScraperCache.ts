interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class ScraperCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly ttl: number;
  private readonly maxEntries: number;

  constructor(options: { ttlMinutes: number; maxEntries: number }) {
    this.ttl = options.ttlMinutes * 60000;
    this.maxEntries = options.maxEntries;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.log(`Cache HIT: ${key}`);
    return entry.data as T;
  }

  async set<T>(key: string, data: T): Promise<void> {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (typeof firstKey === 'string') {
        this.cache.delete(firstKey);
        console.log(`Cache eviction: ${firstKey}`);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    console.log(`Cache SET: ${key} (${this.cache.size}/${this.maxEntries})`);
  }

  clear(): void {
    this.cache.clear();
    console.log('Cache cleared');
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxEntries,
      keys: Array.from(this.cache.keys())
    };
  }
}