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
  mode: 'tabb' | 'lunim' | 'general';
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
        console.warn('⚠️ CLEAR framework creation failed, continuing without it');
      }
    }

    const validatedPosts = this.validatePosts(input.posts);
    console.log(`✓ Validated ${validatedPosts.length} posts`);

    if (validatedPosts.length === 0) {
      throw new AnalysisError('No valid posts to analyze');
    }

let enrichedData: EnrichedData | null = null;
let trendingTopics: any[] = [];

if (options.enrichWithPerplexity && this.perplexity.isEnabled()) {
  try {
    console.log('→ Fetching Perplexity trending topics...');
    
    const trendingPromise = this.perplexity.getTrendingTopics(input.mode);
    const timeoutPromise = new Promise<any[]>((resolve) => 
      setTimeout(() => {
        console.warn('⚠️ Trending topics timeout (30s), continuing without');
        resolve([]);
      }, 30000) 
    );
    
    trendingTopics = await Promise.race([trendingPromise, timeoutPromise]);
    console.log(`✓ Fetched ${trendingTopics.length} trending topics`);
  } catch (error) {
    console.error('⚠️ Perplexity trending topics failed, continuing without:', error);
    trendingTopics = [];
  }
} else {
  console.log('⏭️ Skipping Perplexity trending topics (not enabled)');
}

    console.log('→ Extracting engagement targets...');
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
    console.log('✓ Prompt built successfully');

    console.log('→ Calling OpenAI for analysis...');
    
    let completion;
    try {
      const analysisPromise = this.openai.chat.completions.create({
        model: API_CONFIG.openai.model,
        messages: messages as any,
        temperature: API_CONFIG.openai.temperature,
        max_tokens: 12000,
        response_format: { type: 'json_object' }
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI timeout after 90 seconds')), 90000)
      );

      completion = await Promise.race([analysisPromise, timeoutPromise]) as any;
      console.log('✅ OpenAI response received');
    } catch (openaiError: any) {
      console.error('❌ OpenAI API call failed:', {
        message: openaiError?.message,
        status: openaiError?.status,
        type: openaiError?.type,
        code: openaiError?.code
      });
      throw new AnalysisError(`OpenAI API failed: ${openaiError?.message || 'Unknown error'}`, {
        cause: openaiError
      });
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new AnalysisError('OpenAI returned empty response');
    }

    console.log(`✓ Received ${content.length} characters from OpenAI`);

    console.log('→ Parsing OpenAI response...');
    let analysis;
    try {
      analysis = JSON.parse(content);
      console.log('✓ JSON parsed successfully');
      
      if (!analysis.content_performance_insights || !analysis.engagement_targets) {
        console.warn('⚠️ OpenAI response missing required fields, adding defaults');
        analysis = {
          content_performance_insights: analysis.content_performance_insights || [],
          audience_analysis: analysis.audience_analysis || {
            estimated_people_talking: 0,
            audience_segments: [],
            sentiment_summary: 'Unknown',
            interest_drivers: []
          },
          strategic_recommendations: analysis.strategic_recommendations || [],
          automation_spots: analysis.automation_spots || [],
          next_steps: analysis.next_steps || [],
          engagement_targets: analysis.engagement_targets || [],
          top_talking_points: analysis.top_talking_points || []
        };
      }
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI JSON');
      console.error('Content preview:', content.slice(0, 500));
      
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[1]);
          console.log('✓ Extracted JSON from markdown wrapper');
        } catch (innerError) {
          console.warn('⚠️ Attempting to fix truncated JSON...');
          const fixedContent = this.attemptJsonFix(content);
          if (fixedContent) {
            try {
              analysis = JSON.parse(fixedContent);
              console.log('✓ Fixed and parsed truncated JSON');
            } catch (fixError) {
              throw new AnalysisError('OpenAI returned unparseable JSON', { 
                content: content.slice(0, 1000)
              });
            }
          } else {
            throw new AnalysisError('Could not fix truncated JSON', {
              content: content.slice(0, 1000)
            });
          }
        }
      } else {
        throw new AnalysisError('OpenAI returned invalid JSON (no markdown wrapper found)', {
          content: content.slice(0, 1000)
        });
      }
    }

    console.log('→ Running quality checks...');
    const qualityScore = QualityMetrics.scoreAnalysis(analysis, clearContext);
    console.log(QualityMetrics.generateReportCard(qualityScore));

    if (qualityScore.overall < 50) {
      console.warn('⚠️ Quality score is low - consider refining the analysis');
    }

    analysis._qualityScore = qualityScore;

    console.log('→ Post-processing results...');
    const finalResult = this.postProcess(analysis, enrichedData, trendingTopics, {
    processingTime: Date.now() - startTime,
    postsAnalyzed: validatedPosts.length,
    perplexityUsed: trendingTopics.length > 0 || validatedPosts.some(p => p.metadata?.source === 'perplexity'), 
    perplexityScrapedPosts: validatedPosts.filter(p => 
      p.metadata?.source === 'perplexity'
    ).length,
    mode: input.mode
  });

    if (!finalResult._qualityScore && qualityScore) {
      finalResult._qualityScore = qualityScore;  
    }

    const totalTime = Date.now() - startTime;
    console.log('=== Analysis Pipeline Complete ===');
    console.log(`✅ Total processing time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`✅ Insights: ${finalResult.content_performance_insights.length}`);
    console.log(`✅ Targets: ${finalResult.engagement_targets.length}`);
    console.log(`✅ Recommendations: ${finalResult.strategic_recommendations.length}`);

    return finalResult;

  } catch (error: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ ANALYSIS PIPELINE FAILED');
    console.error('='.repeat(60));
    console.error('Error Type:', error?.constructor?.name || 'Unknown');
    console.error('Error Message:', error?.message || 'No message');
    
    if (error?.details) {
      console.error('Error Details:', JSON.stringify(error.details, null, 2));
    }
    
    if (error instanceof Error && error.stack) {
      console.error('Stack Trace:', error.stack);
    }
    
    console.error('='.repeat(60) + '\n');
    
    throw error instanceof AnalysisError 
      ? error 
      : new AnalysisError('Pipeline execution failed', { 
          cause: error,
          message: error?.message,
          type: error?.constructor?.name
        });
  }
}

private attemptJsonFix(content: string): string | null {
  try {
    let fixed = content.trim();
    
    if (fixed.endsWith('"')) {
    } else if (fixed.match(/"[^"]*$/)) {
      fixed += '"';
    }
    
    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    
    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixed += '}';
    }
    
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      fixed += ']';
    }
    
    return fixed;
  } catch (e) {
    console.error('JSON fix attempt failed:', e);
    return null;
  }
}

  private validatePosts(posts: ScrapedPost[]): ScrapedPost[] {
    const seen = new Set<string>();
    const unique = posts.filter(post => {
      const key = `${post.platform}-${post.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

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


private isRelevantCreator(handle: string, summary: string, mode: 'tabb' | 'lunim' | 'general'): { isRelevant: boolean; boost: number } {
  const handleLower = handle.toLowerCase();
  const summaryLower = summary.toLowerCase();

  if (mode === 'general') {
    return { isRelevant: true, boost: 0 };
  }
  
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

private extractEngagementTargets(posts: ScrapedPost[], minCount: number, mode: 'tabb' | 'lunim' | 'general'): any[] {
  const map = new Map<string, any>();

  const perplexityPosts = posts.filter(p => 
    p.metadata?.source === 'perplexity' || 
    p._sources?.includes('perplexity')
  );
  
  console.log(`\n📊 Engagement Target Extraction:`);
  console.log(`  Total posts: ${posts.length}`);
  console.log(`  Perplexity posts: ${perplexityPosts.length}`);
  console.log(`  YouTube posts: ${posts.filter(p => p.platform === 'youtube').length}`);
  console.log(`  Reddit posts: ${posts.filter(p => p.platform === 'reddit').length}`);

  for (const post of posts) {
    const key = `${post.platform}:${post.creator_handle}`;

    if (!map.has(key)) {
      const displayPlatform = (post.metadata?.source === 'perplexity' || post._sources?.includes('perplexity'))
        ? 'perplexity'
        : post.platform;

      map.set(key, {
        creator_handle: post.creator_handle,
        platform: displayPlatform, 
        post_link: post.post_link,
        summary: post.content.slice(0, 300),
        engagement: post.engagement || {},
        _sources: post._sources || [post.metadata?.source || post.platform],
        _qualityScore: post._qualityScore || 50,
        metadata: {
          source: post.metadata?.source || post.platform,
          verified: post.metadata?.verified || false,
          originalPlatform: post.metadata?.originalPlatform || post.platform, 
          scrapedAt: post.metadata?.scrapedAt
        }
      });
    } else {
      const existing = map.get(key);
      if (post._sources) {
        existing._sources = [...new Set([...existing._sources, ...post._sources])];
      }
      if (post.metadata?.verified) {
        existing.metadata.verified = true;
      }
      if (post._qualityScore && post._qualityScore > existing._qualityScore) {
        existing._qualityScore = post._qualityScore;
      }
    }
  }

  const targets = Array.from(map.values());
  
  const perplexityTargets = targets.filter(t => 
    t.platform === 'perplexity' 
  );
  const multiSourceTargets = targets.filter(t => t._sources && t._sources.length > 1);
  
  console.log(`  Targets before ranking: ${targets.length}`);
  console.log(`  Perplexity targets: ${perplexityTargets.length}`);
  console.log(`  Multi-source targets: ${multiSourceTargets.length}`);

  const ranked = this.rankTargets(targets, minCount, mode);
  
  const finalPerplexity = ranked.filter(t => t.platform === 'perplexity'); 
  console.log(`  Final targets after ranking: ${ranked.length}`);
  console.log(`  Final Perplexity targets: ${finalPerplexity.length}`);
  
  return ranked;
}

private rankTargets(targets: any[], minCount: number, mode: 'tabb' | 'lunim' | 'general'): any[] {
  const relevantTargets = targets.filter(t => {
    const relevance = this.isRelevantCreator(t.creator_handle, t.summary, mode);
    return relevance.isRelevant;
  });

  console.log(`  Filtered: ${relevantTargets.length} relevant out of ${targets.length} total`);

  const youtubeTargets = relevantTargets.filter(t => 
    t.metadata?.originalPlatform === 'youtube' || 
    (t.platform === 'youtube' && t.metadata?.source !== 'perplexity')
  );
  
  const perplexityTargets = relevantTargets.filter(t => 
    t.platform === 'perplexity' || t.metadata?.source === 'perplexity'
  );
  
  const otherTargets = relevantTargets.filter(t => 
    !youtubeTargets.includes(t) && !perplexityTargets.includes(t)
  );

  console.log(`  Platform split: YouTube=${youtubeTargets.length}, Perplexity=${perplexityTargets.length}, Other=${otherTargets.length}`);

  const scoredTargets = relevantTargets.map(t => {
    const hasQuestion = /\?/.test(t.summary);
    const isPersonal = /\b(i|my|me|we|our)\b/i.test(t.summary);
    const isFrustrated = /\b(struggle|stuck|hard|issue|problem|difficult|challenge)\b/i.test(t.summary);
    const hasSpecifics = /\b(how|what|why|when|where)\b/i.test(t.summary);
    
    let score = 50;
    
    const isYouTube = t.metadata?.originalPlatform === 'youtube' || 
                      (t.platform === 'youtube' && t.metadata?.source !== 'perplexity');
    
    if (isYouTube) {
      score += 40; 
    }
    
    if (t.metadata?.verified || t._sources?.includes('perplexity')) {
      score += 30;
    }
    
    if (t._sources && t._sources.length > 1) {
      score += 20;
    }
    
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
      is_relevant_to_mode: true,
      creator_tier: this.determineCreatorTier(t.engagement),
      followers_estimate: t.engagement?.views || 0,
      is_verified: t.metadata?.verified || false,
      recommended_engagement: hasQuestion || isFrustrated ? '1:1 reply' : 'Public comment',
      pain_point_match: isFrustrated 
        ? 'High-friction workflow pain point' 
        : hasQuestion
        ? 'Active learning/seeking help'
        : 'General interest or shared experience',
      _sources: t._sources,
      _qualityScore: score,
      metadata: t.metadata
    };
  });

  const sorted = scoredTargets.sort((a, b) => b.relevance_score - a.relevance_score);

  const MIN_YOUTUBE = 8;
  const youtubeScored = sorted.filter(t => 
    t.metadata?.originalPlatform === 'youtube' || 
    (t.platform === 'youtube' && t.metadata?.source !== 'perplexity')
  );
  const nonYoutubeScored = sorted.filter(t => 
    !(t.metadata?.originalPlatform === 'youtube' || 
      (t.platform === 'youtube' && t.metadata?.source !== 'perplexity'))
  );

  console.log(`  Scored: YouTube=${youtubeScored.length}, Non-YouTube=${nonYoutubeScored.length}`);

  const selectedYouTube = youtubeScored.slice(0, Math.max(MIN_YOUTUBE, youtubeScored.length));
  
  const remainingSlots = Math.max(minCount, 15) - selectedYouTube.length;
  const selectedOthers = nonYoutubeScored.slice(0, remainingSlots);

  const finalTargets = [...selectedYouTube, ...selectedOthers];

  console.log(`  ✅ Final selection: ${selectedYouTube.length} YouTube + ${selectedOthers.length} others = ${finalTargets.length} total`);

  return finalTargets;
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
  trendingTopics: any[], 
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
    ...metadata,
    enrichmentSources: enrichedData ? ['perplexity'] : [],
    generatedAt: new Date().toISOString(),
    perplexityScrapedPosts: metadata.perplexityScrapedPosts || 0
  },
    
    _qualityScore: analysis._qualityScore
  };

  if (trendingTopics && trendingTopics.length > 0) {
    console.log('\n🔥 Adding trending topics to Content Performance Insights...');
    
    const trendingInsights = trendingTopics.map(topic => ({
      topic: topic.topic,
      why_it_performed: topic.why_trending,
      supporting_examples: topic.video_examples.map((video: any) => ({
        title: video.title,
        link: video.url
      })),
      engagement_pattern: topic.engagement_pattern,
      _enriched: true,
      _perplexity_trending: true
    }));
    
    enhanced.content_performance_insights = [
      ...enhanced.content_performance_insights,
      ...trendingInsights
    ];
    
    console.log(`  ✓ Added ${trendingInsights.length} trending topic insights`);
  }

  if (enrichedData) {
    console.log('\n⚡ ENRICHING SECTIONS with Perplexity data...');
    
    if (enrichedData.context && enrichedData.context.length > 0) {
      const perplexityRecommendations = enrichedData.context.slice(0, 2).map(ctx => ({
        recommendation: `Market-Validated Strategy: ${ctx.topic}`,
        reasoning: this.cleanMarkdown(ctx.insight.slice(0, 200)), 
        expected_outcome: `This approach is backed by current industry trends and ${Math.round(ctx.confidence * 100)}% confidence from verified sources.`,
        _enriched: true
      }));
      
      enhanced.strategic_recommendations = [
        ...enhanced.strategic_recommendations,
        ...perplexityRecommendations
      ];
      
      console.log(`  ✓ Added ${perplexityRecommendations.length} Perplexity recommendations`);
    }

    if (enrichedData.trends && enrichedData.trends.length > 0) {
      const perplexityTopics = enrichedData.trends.slice(0, 2).map(trend => ({
        topic: trend.topic,
        what_people_are_saying: this.cleanMarkdown(trend.summary), 
        keywords: trend.topic.split(' ').filter(w => w.length > 3).slice(0, 5),
        growth_trend: `Verified industry trend from ${trend.date} (Relevance: ${Math.round(trend.relevanceScore * 100)}%)`,
        _enriched: true
      }));
      
      enhanced.top_talking_points = [
        ...enhanced.top_talking_points,
        ...perplexityTopics
      ];
      
      console.log(`  ✓ Added ${perplexityTopics.length} Perplexity topics`);
    }

    if (enrichedData.verifiedFacts && enrichedData.verifiedFacts.length > 0) {
      const additionalDrivers = enrichedData.verifiedFacts
        .slice(0, 3)
        .map(fact => this.cleanMarkdown(fact.claim.slice(0, 100))); 
      
      enhanced.audience_analysis.interest_drivers = [
        ...(enhanced.audience_analysis.interest_drivers || []),
        ...additionalDrivers
      ];
      
      console.log(`  ✓ Added ${additionalDrivers.length} verified facts`);
    }
    
    console.log('⚡ Section enrichment complete!\n');
  }

  return enhanced;
}

private cleanMarkdown(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

}