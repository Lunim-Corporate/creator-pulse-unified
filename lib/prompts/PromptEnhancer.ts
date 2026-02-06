
import { ClearFrameworkEnhancer } from './ClearFramework';
import type { ClearPrompt } from './ClearFramework';

export class PromptEnhancer {
  private enhancer: ClearFrameworkEnhancer;

  constructor(apiKey: string) {
    this.enhancer = new ClearFrameworkEnhancer();
  }

  async enhancePrompt(rawPrompt: string, mode: 'tabb' | 'lunim' | 'general'): Promise<ClearPrompt> {
    return this.enhancer.enhancePrompt(rawPrompt, mode);
  }
}

export type { ClearPrompt };