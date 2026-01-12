import OpenAI from 'openai';
import { PerplexityService } from './PerplexityService';
import { AnalysisError } from '../utils/error';
import { API_CONFIG } from '../config/api.config';
import type { ScrapedPost } from '../scrapers/types';
import type { EnrichedData } from './PerplexityService';
import { validateAgainstClear, generateClearPromptSection } from '../clear/normalizeclear';
import { QualityMetrics } from '../analytics/QualityMetric';
import { normalizeClearPrompt } from '../clear/normalizeclear';
import type { ClearPrompt } from '../clear/normalizeclear';
import { AnalysisPromptBuilder } from '../prompts/AnalysisPromptBuilder';

export interface AnalysisInput {
  posts: ScrapedPost[];
  prompt?: string;
  mode: 'tabb' | 'lunim';
  options?: AnalysisOptions;
}

export interface AnalysisOptions {
  enrichWithPerplexity?: boolean;
  minEngagementTargets?: number;
  includeTrends?: boolean;
}

export interface AnalysisResult {
  content_performance_insights: any[];
  audience_analysis: any;
  strategic_recommendations: any[];
  automation_spots: any[];
  next_steps: any[];
  engagement_targets: any[];
  top_talking_points: any[];
  _metadata?: {
    processingTime: number;
    postsAnalyzed: number;
    perplexityUsed: boolean;
    enrichmentSources: string[];
    generatedAt: string;
    mode: string;
  };
  _qualityScore?: any;
}

export class AnalysisPipeline {
  private openai: OpenAI;
  private perplexity: PerplexityService;

  constructor() {
    this.openai = new OpenAI({ apiKey: API_CONFIG.openai.apiKey });
    this.perplexity = new PerplexityService();
  }

  async execute(input: AnalysisInput): Promise<AnalysisResult> {
  const startTime = Date.now();
  const options = {
    enrichWithPerplexity: true,
    minEngagementTargets: 15,
    includeTrends: true,
    ...input.options
  };

  console.log('=== Analysis Pipeline Started ===');
  console.log(`Mode: ${input.mode}`);
  console.log(`Posts: ${input.posts.length}`);
  console.log(`Perplexity enabled: ${options.enrichWithPerplexity && this.perplexity.isEnabled()}`);

  try {
    let clearContext: ClearPrompt | undefined = undefined;
    if (input.prompt) {
      try {
        clearContext = await normalizeClearPrompt(input.prompt, input.mode);
        console.log('✓ CLEAR framework applied');
      } catch (error) {
        console.warn('CLEAR framework creation failed:', error);
      }
    }

    const validatedPosts = this.validatePosts(input.posts);
    console.log(`✓ Validated ${validatedPosts.length} posts`);

    let enrichedData: EnrichedData | null = null;
    if (options.enrichWithPerplexity && this.perplexity.isEnabled()) {
      try {
        enrichedData = await this.perplexity.enrichPosts(validatedPosts, input.mode);
        console.log(`✓ Perplexity enrichment complete`);
      } catch (error) {
        console.error('Perplexity enrichment failed, continuing without:', error);
      }
    }

    const engagementTargets = this.extractEngagementTargets(
      validatedPosts,
      options.minEngagementTargets || 10, 
      input.mode 
    );
    console.log(`✓ Extracted ${engagementTargets.length} engagement targets`);

    console.log('→ Building analysis prompt...');
    const messages = AnalysisPromptBuilder.buildCompleteMessages(
      input.mode,
      validatedPosts,
      engagementTargets,
      clearContext,
      enrichedData || undefined,
      input.prompt
    );

    console.log('→ Calling OpenAI for analysis...');
    const completion = await this.openai.chat.completions.create({
      model: API_CONFIG.openai.model,
      messages: messages as any, // TypeScript workaround for message types
      temperature: API_CONFIG.openai.temperature,
      max_tokens: API_CONFIG.openai.maxTokens,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new AnalysisError('OpenAI returned no content');
    }

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (e) {
      throw new AnalysisError('OpenAI returned invalid JSON', { content });
    }

    console.log('→ Running quality checks...');
    const qualityScore = QualityMetrics.scoreAnalysis(
      analysis, 
      clearContext
    );
    console.log(QualityMetrics.generateReportCard(qualityScore));

    if (qualityScore.overall < 50) {
      console.warn('  Quality score is low - consider refining the analysis');
    }

    analysis._qualityScore = qualityScore;

    const finalResult = this.postProcess(analysis, enrichedData, {
      processingTime: Date.now() - startTime,
      postsAnalyzed: validatedPosts.length,
      perplexityUsed: !!enrichedData,
      mode: input.mode
    });

    if (!finalResult._qualityScore && qualityScore) {
      finalResult._qualityScore = qualityScore;  // ← ADD THIS SAFETY CHECK
    }

    console.log('=== Analysis Pipeline Complete ===');
    console.log(`Processing time: ${finalResult._metadata?.processingTime}ms`);

    return finalResult;
  } catch (error) {
    console.error('=== Analysis Pipeline Failed ===');
    throw error instanceof AnalysisError 
      ? error 
      : new AnalysisError('Pipeline execution failed', { cause: error });
  }
}

  private validatePosts(posts: ScrapedPost[]): ScrapedPost[] {
    // Remove duplicates
    const seen = new Set<string>();
    const unique = posts.filter(post => {
      const key = `${post.platform}-${post.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter invalid posts
    return unique.filter(post => {
      return !!(
        post.id &&
        post.platform &&
        post.content &&
        post.content.length > 10 &&
        post.post_link &&
        post.creator_handle
      );
    });
  }


private isRelevantCreator(handle: string, summary: string, mode: 'tabb' | 'lunim'): { isRelevant: boolean; boost: number } {
  const handleLower = handle.toLowerCase();
  const summaryLower = summary.toLowerCase();
  
  if (mode === 'tabb') {
    const tabbKeywords = [
      'film', 'filmmaker', 'director', 'cinematographer', 'videographer',
      'producer', 'production', 'camera', 'lens', 'lighting', 'dp',
      'editor', 'editing', 'post', 'color grade', 'sound design',
      'screenwriter', 'script', 'short film', 'feature', 'documentary',
      'indie film', 'creator', 'content creator', 'youtube creator',
      'video production', 'film school', 'cinematography', 'crew',
      'shoot', 'shooting', 'on set', 'pre-production', 'post-production'
    ];
    
    for (const keyword of tabbKeywords) {
      if (handleLower.includes(keyword)) {
        return { isRelevant: true, boost: 30 };
      }
    }
    
    let matchCount = 0;
    for (const keyword of tabbKeywords) {
      if (summaryLower.includes(keyword)) {
        matchCount++;
      }
    }
    
    if (matchCount >= 2) return { isRelevant: true, boost: 20 };
    if (matchCount === 1) return { isRelevant: true, boost: 10 };
    
    return { isRelevant: false, boost: -20 }; 
    
  } else {
    const lunimKeywords = [
      'ai', 'artificial intelligence', 'design', 'creative tech', 'innovation',
      'digital transformation', 'design thinking', 'ux', 'ui', 'product design',
      'creative', 'technology', 'automation', 'workflow', 'productivity',
      'tool', 'saas', 'platform', 'software', 'app', 'digital',
      'strategy', 'branding', 'marketing', 'business', 'startup',
      'tech', 'developer', 'engineer', 'cto', 'product manager'
    ];
    
    for (const keyword of lunimKeywords) {
      if (handleLower.includes(keyword)) {
        return { isRelevant: true, boost: 30 };
      }
    }
    
    let matchCount = 0;
    for (const keyword of lunimKeywords) {
      if (summaryLower.includes(keyword)) {
        matchCount++;
      }
    }
    
    if (matchCount >= 2) return { isRelevant: true, boost: 20 };
    if (matchCount === 1) return { isRelevant: true, boost: 10 };
    
    return { isRelevant: false, boost: -20 };
  }
}

private extractEngagementTargets(posts: ScrapedPost[], minCount: number, mode: 'tabb' | 'lunim'): any[] {
  const map = new Map<string, any>();

  for (const post of posts) {
    const key = `${post.platform}:${post.creator_handle}`;

    if (!map.has(key)) {
      map.set(key, {
        creator_handle: post.creator_handle,
        platform: post.platform,
        post_link: post.post_link,
        summary: post.content.slice(0, 300),
        engagement: post.engagement || {}
      });
    }
  }

  const targets = Array.from(map.values());
  return this.rankTargets(targets, minCount, mode);
}

private rankTargets(targets: any[], minCount: number, mode: 'tabb' | 'lunim'): any[] {
  return targets
    .map(t => {
      const hasQuestion = /\?/.test(t.summary);
      const isPersonal = /\b(i|my|me|we|our)\b/i.test(t.summary);
      const isFrustrated = /\b(struggle|stuck|hard|issue|problem|difficult|challenge)\b/i.test(t.summary);
      const hasSpecifics = /\b(how|what|why|when|where)\b/i.test(t.summary);
      
      let score = 50;
      
      const relevance = this.isRelevantCreator(t.creator_handle, t.summary, mode);
      score += relevance.boost;
      
      if (hasQuestion) score += 20;
      if (isPersonal) score += 15;
      if (isFrustrated) score += 15;
      if (hasSpecifics) score += 10;
      
      if (t.engagement?.comments > 10) score += 10;
      if (t.engagement?.likes > 50) score += 5;
      if (t.engagement?.views > 1000) score += 5;

      return {
        ...t,
        relevance_score: score,
        is_relevant_to_mode: relevance.isRelevant,
        creator_tier: this.determineCreatorTier(t.engagement),
        followers_estimate: t.engagement?.views || 0,
        is_verified: false,
        recommended_engagement: hasQuestion || isFrustrated ? '1:1 reply' : 'Public comment',
        pain_point_match: isFrustrated 
          ? 'High-friction workflow pain point' 
          : hasQuestion
          ? 'Active learning/seeking help'
          : 'General interest or shared experience'
      };
    })
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, Math.max(minCount, 10)); // Ensure minimum 10 targets
}



  private determineCreatorTier(engagement?: any): string {
    if (!engagement) return 'emerging';
    
    const views = engagement.views || 0;
    const likes = engagement.likes || 0;
    
    if (views > 100000 || likes > 10000) return 'established';
    if (views > 10000 || likes > 1000) return 'growing';
    return 'emerging';
  }

  private postProcess(
  analysis: any,
  enrichedData: EnrichedData | null,
  metadata: any
): AnalysisResult {
  const enhanced: AnalysisResult = {
    content_performance_insights: analysis.content_performance_insights || [],
    audience_analysis: analysis.audience_analysis || {},
    strategic_recommendations: analysis.strategic_recommendations || [],
    automation_spots: analysis.automation_spots || [],
    next_steps: analysis.next_steps || [],
    engagement_targets: analysis.engagement_targets || [],
    top_talking_points: analysis.top_talking_points || [],
    
    _metadata: {
      processingTime: metadata.processingTime,
      postsAnalyzed: metadata.postsAnalyzed,
      perplexityUsed: metadata.perplexityUsed,
      enrichmentSources: enrichedData ? ['perplexity'] : [],
      generatedAt: new Date().toISOString(),
      mode: metadata.mode
    },
    
    _qualityScore: analysis._qualityScore
  };

  if (enhanced.content_performance_insights.length < 2) {
    console.warn('  Insufficient content insights generated');
  }

  if (enhanced.engagement_targets.length < 10) {
    console.warn(`  Only ${enhanced.engagement_targets.length} engagement targets found`);
  }

  if (enrichedData?.trends && enrichedData.trends.length > 0) {
    enhanced.content_performance_insights = enhanced.content_performance_insights.map(insight => ({
      ...insight,
      _enriched: enrichedData.trends.some(t => 
        insight.topic.toLowerCase().includes(t.topic.toLowerCase())
      )
    }));
  }

  return enhanced;
}
}