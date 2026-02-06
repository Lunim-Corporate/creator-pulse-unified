export class RateLimiter {
  private queue: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(config: { requestsPerMinute: number }) {
    this.maxRequests = config.requestsPerMinute;
    this.windowMs = 60000; 
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    this.queue = this.queue.filter(time => now - time < this.windowMs);

    if (this.queue.length >= this.maxRequests) {
      const oldestRequest = this.queue[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 100; 
      
      console.log(`Rate limit: waiting ${waitTime}ms`);
      await this.sleep(waitTime);
      return this.waitForSlot();
    }

    this.queue.push(now);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  reset(): void {
    this.queue = [];
  }

  getQueueLength(): number {
    const now = Date.now();
    this.queue = this.queue.filter(time => now - time < this.windowMs);
    return this.queue.length;
  }
}