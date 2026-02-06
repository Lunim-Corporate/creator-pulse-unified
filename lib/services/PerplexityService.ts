import OpenAI from 'openai';
import { PerplexityError } from '../utils/error';
import { API_CONFIG } from '../config/api.config';
import type { ScrapedPost } from '../scrapers/types';

export interface TrendingTopic {
  topic: string;
  why_trending: string;
  video_examples: VideoExample[];
  engagement_pattern: string;
}

export interface VideoExample {
  title: string;
  url: string;
  channel: string;
  views: number;
  likes: number;
  why_it_performed: string;
}

export interface PerplexityQuery {
  topic: string;
  context?: string;
  focusAreas?: string[];
}

export interface PerplexityResponse {
  content: string;
  citations: Citation[];
  confidence: number;
}

export interface Citation {
  url: string;
  title?: string;
  snippet?: string;
}

export interface EnrichedData {
  trends: TrendData[];
  context: ContextualInsight[];
  verifiedFacts: VerifiedClaim[];
  relatedTopics: string[];
}

export interface TrendData {
  topic: string;
  summary: string;
  source: string;
  date: string;
  relevanceScore: number;
}

export interface ContextualInsight {
  topic: string;
  insight: string;
  sources: string[];
  confidence: number;
}

export interface VerifiedClaim {
  claim: string;
  confidence: number;
  sources: string[];
  verifiedAt: string;
}

export class PerplexityService {
  private client: OpenAI;
  private enabled: boolean;

  constructor() {
    this.enabled = API_CONFIG.perplexity.enabled;
    
    if (this.enabled) {
      this.client = new OpenAI({
        apiKey: API_CONFIG.perplexity.apiKey,
        baseURL: 'https://api.perplexity.ai'
      });
    } else {
      console.warn('Perplexity API not configured - enrichment will be skipped');
      this.client = null as any;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async enrichPosts(
    posts: ScrapedPost[],
    mode: 'tabb' | 'lunim' | 'general' 
  ): Promise<EnrichedData | null> {
    if (!this.enabled) {
      console.log('Perplexity enrichment skipped (not configured)');
      return null;
    }

    try {
      console.log(`Starting Perplexity enrichment for ${posts.length} posts in ${mode} mode`);
      
      const topics = await this.extractTopics(posts, mode);
      console.log(`Extracted ${topics.length} topics for enrichment`);

      if (topics.length === 0) {
        console.warn('No topics extracted from posts');
        return this.getEmptyEnrichment();
      }

      const topTopics = topics.slice(0, 5);
      const enrichmentResults = await this.batchQuery(
        topTopics.map(t => ({
          topic: t.text,
          context: this.buildContextForMode(mode),
          focusAreas: t.focusAreas
        }))
      );

      const enriched = this.synthesizeResults(enrichmentResults, topTopics);
      
      console.log(`Perplexity enrichment complete:`, {
        trends: enriched.trends.length,
        facts: enriched.verifiedFacts.length,
        insights: enriched.context.length
      });

      return enriched;
    } catch (error) {
      console.error('Perplexity enrichment failed:', error);
      return this.getEmptyEnrichment();
    }
  }

  async query(queryParams: PerplexityQuery): Promise<PerplexityResponse> {
    if (!this.enabled) {
      throw new PerplexityError('Perplexity API not configured');
    }

    const systemPrompt = this.buildSystemPrompt(queryParams);
    const userPrompt = this.buildUserPrompt(queryParams);

    try {
      const completion = await this.client.chat.completions.create({
        model: API_CONFIG.perplexity.model,
        max_tokens: API_CONFIG.perplexity.maxTokens,
        temperature: API_CONFIG.perplexity.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      const response = completion.choices[0].message;
      
      return {
        content: response.content || '',
        citations: this.extractCitations(response.content || ''),
        confidence: 0.75
      };
    } catch (error: any) {
      throw new PerplexityError(
        `Perplexity query failed: ${error.message}`,
        { cause: error, query: queryParams }
      );
    }
  }

  private async batchQuery(queries: PerplexityQuery[]): Promise<PerplexityResponse[]> {
    const results: PerplexityResponse[] = [];
    const batchSize = 3; 

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(q => 
          this.query(q).catch(err => {
            console.error(`Query failed for topic "${q.topic}":`, err);
            return this.getEmptyResponse();
          })
        )
      );
      
      results.push(...batchResults);
      
      if (i + batchSize < queries.length) {
        await this.sleep(1500);
      }
    }

    return results;
  }

  private async extractTopics(
    posts: ScrapedPost[],
    mode: 'tabb' | 'lunim' | 'general' 
  ): Promise<ExtractedTopic[]> {
    const allContent = posts
      .map(p => p.content.slice(0, 500))
      .join('\n\n---\n\n')
      .slice(0, 15000);

    const systemPrompt = `Extract key topics from creator content for ${
      mode === 'tabb' 
        ? 'filmmaking/creator' 
        : mode === 'lunim'
        ? 'creative tech/innovation'
        : 'general creator' 
    } research.

${mode === 'tabb' 
  ? 'Focus: filmmaking workflows, collaboration, creator economy, production tools, team coordination' 
  : mode === 'lunim'
  ? 'Focus: creative AI, design thinking, digital transformation, innovation tools, strategic tech adoption'
  : 'Focus: content creation trends, cross-platform strategies, audience engagement, creator tools, general content performance' // ← Added
}

Return JSON:
{
  "topics": [
    {
      "text": "topic description",
      "keywords": ["key", "terms"],
      "focusAreas": ["specific aspects"],
      "relevance": 0.9
    }
  ]
}

Extract 3-7 most relevant, high-impact topics. Prioritize topics that appear frequently or have strong engagement signals.`;

    try {
      const openai = new OpenAI({ apiKey: API_CONFIG.openai.apiKey });
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: allContent }
        ]
      });

      const parsed = JSON.parse(response.choices[0].message.content || '{"topics":[]}');
      return (parsed.topics || [])
        .filter((t: any) => t.relevance > 0.5)
        .sort((a: any, b: any) => b.relevance - a.relevance);
    } catch (error) {
      console.error('Topic extraction failed:', error);
      return this.getFallbackTopics(mode);
    }
  }

  private buildSystemPrompt(query: PerplexityQuery): string {
    return `You are a research analyst providing current, verified information about creator economy and content production trends.

REQUIREMENTS:
- Focus on information from the last 6 months
- Cite sources with URLs when possible
- Prioritize industry reports, creator interviews, and data-driven sources
- Flag speculative or unverified claims
- Provide actionable insights

${query.context || ''}

Format your response as:
1. Executive summary (2-3 sentences)
2. Key findings (3-5 bullet points)
3. Current trends
4. Actionable recommendations

Include citations as [Source: URL] where possible.`;
  }

  private buildUserPrompt(query: PerplexityQuery): string {
    let prompt = `Research topic: ${query.topic}\n`;
    
    if (query.focusAreas && query.focusAreas.length > 0) {
      prompt += `\nFocus areas:\n${query.focusAreas.map(a => `- ${a}`).join('\n')}\n`;
    }

    prompt += `\nProvide comprehensive, well-cited research on this topic in the context of the creator economy and content production.`;

    return prompt;
  }

  private buildContextForMode(mode: 'tabb' | 'lunim' | 'general'): string { // ← Updated
    const contexts = {
      tabb: `Context: Tabb is a project-centered network for filmmakers and creative teams. 
Research should focus on: collaboration tools, creator workflows, production challenges, team coordination, independent filmmaker market, and creative project management.`,
      
      lunim: `Context: Lunim Studio is a creative technology company specializing in AI integration and design thinking.
Research should focus on: creative AI tools, design innovation, digital transformation, strategic technology adoption, and future-facing creativity.`,

      general: `Context: General creator analysis across all industries and platforms.
Research should focus on: universal creator trends, cross-platform strategies, general content performance, audience engagement patterns, and broad creator economy insights.` // ← Added
    };

    return contexts[mode];
  }

  private extractCitations(content: string): Citation[] {
    const citations: Citation[] = [];
    
    const urlRegex = /\[Source:\s*(https?:\/\/[^\]]+)\]/gi;
    let match;
    
    while ((match = urlRegex.exec(content)) !== null) {
      citations.push({
        url: match[1],
        title: 'Referenced source'
      });
    }

    const plainUrlRegex = /https?:\/\/[^\s\)]+/g;
    const plainUrls = content.match(plainUrlRegex) || [];
    
    plainUrls.forEach(url => {
      if (!citations.some(c => c.url === url)) {
        citations.push({ url });
      }
    });

    return citations;
  }

  private synthesizeResults(
    results: PerplexityResponse[],
    topics: ExtractedTopic[]
  ): EnrichedData {
    const trends: TrendData[] = [];
    const context: ContextualInsight[] = [];
    const verifiedFacts: VerifiedClaim[] = [];
    const relatedTopics: string[] = [];

    results.forEach((result, index) => {
      const topic = topics[index];

      if (!result.content) return;

      const trendKeywords = ['trend', 'trending', 'popular', 'growing', 'emerging', 'shift'];
      const sentences = result.content.split(/[.!?]+/);
      
      sentences.forEach(sentence => {
        if (trendKeywords.some(kw => sentence.toLowerCase().includes(kw))) {
          trends.push({
            topic: topic.text,
            summary: sentence.trim(),
            source: 'Perplexity',
            date: new Date().toISOString().split('T')[0],
            relevanceScore: topic.relevance || 0.7
          });
        }
      });

      context.push({
        topic: topic.text,
        insight: result.content.slice(0, 500),
        sources: result.citations.map(c => c.url),
        confidence: result.confidence
      });

      result.citations.forEach(citation => {
        if (citation.snippet) {
          verifiedFacts.push({
            claim: citation.snippet,
            confidence: result.confidence,
            sources: [citation.url],
            verifiedAt: new Date().toISOString()
          });
        }
      });

      topic.keywords.forEach(kw => {
        if (!relatedTopics.includes(kw)) {
          relatedTopics.push(kw);
        }
      });
    });

    return {
      trends: this.deduplicateTrends(trends).slice(0, 10),
      context,
      verifiedFacts: this.deduplicateFacts(verifiedFacts).slice(0, 15),
      relatedTopics: relatedTopics.slice(0, 20)
    };
  }

  private deduplicateTrends(trends: TrendData[]): TrendData[] {
    const seen = new Set<string>();
    return trends.filter(trend => {
      const key = `${trend.topic}:${trend.summary.slice(0, 50)}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private deduplicateFacts(facts: VerifiedClaim[]): VerifiedClaim[] {
    const seen = new Set<string>();
    return facts.filter(fact => {
      const key = fact.claim.slice(0, 100).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private getFallbackTopics(mode: 'tabb' | 'lunim' | 'general'): ExtractedTopic[] { 
    const fallbacks = {
      tabb: [
        { text: 'Filmmaker collaboration challenges', keywords: ['workflow', 'team'], focusAreas: ['remote work'], relevance: 0.8 },
        { text: 'Creator economy monetization', keywords: ['revenue', 'platforms'], focusAreas: ['sustainability'], relevance: 0.7 }
      ],
      lunim: [
        { text: 'AI in creative workflows', keywords: ['automation', 'tools'], focusAreas: ['productivity'], relevance: 0.8 },
        { text: 'Design thinking methodologies', keywords: ['process', 'innovation'], focusAreas: ['implementation'], relevance: 0.7 }
      ],
      general: [ 
        { text: 'Content creator trends and strategies', keywords: ['engagement', 'growth'], focusAreas: ['audience building'], relevance: 0.8 },
        { text: 'Cross-platform content distribution', keywords: ['multi-platform', 'reach'], focusAreas: ['optimization'], relevance: 0.75 },
        { text: 'Creator economy monetization methods', keywords: ['revenue', 'sponsorships'], focusAreas: ['diversification'], relevance: 0.7 }
      ]
    };

    return fallbacks[mode];
  }

  private getEmptyResponse(): PerplexityResponse {
    return {
      content: '',
      citations: [],
      confidence: 0
    };
  }

  private getEmptyEnrichment(): EnrichedData {
    return {
      trends: [],
      context: [],
      verifiedFacts: [],
      relatedTopics: []
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

async getTrendingTopics(mode: 'tabb' | 'lunim' | 'general'): Promise<TrendingTopic[]> {
  if (!this.enabled) {
    console.log('Perplexity not enabled - skipping trending topics');
    return [];
  }

  try {
    console.log(`\n🔥 Fetching trending topics for ${mode} mode...`);
    
    const searchQuery = this.buildTrendingQuery(mode);
    
    const response = await this.client.chat.completions.create({
      model: API_CONFIG.perplexity.model,
      max_tokens: 4000,
      temperature: 0.2,
      messages: [
        { 
          role: 'system', 
          content: this.getTrendingSystemPrompt(mode)
        },
        { 
          role: 'user', 
          content: searchQuery 
        }
      ]
    });

    const content = response.choices[0].message.content || '';
    const topics = this.parseTrendingTopics(content);
    
    console.log(`  ✓ Found ${topics.length} trending topics`);
    
    return topics;
  } catch (error) {
    console.error('Failed to fetch trending topics:', error);
    return [];
  }
}

private buildTrendingQuery(mode: 'tabb' | 'lunim' | 'general'): string {
  const queries = {
    tabb: `What are the top 5 trending topics in filmmaking and video production right now? 

For each topic:
1. Explain why it's trending
2. Provide 5-8 actual YouTube video examples with exact titles and URLs
3. Include engagement metrics (views, likes) if available
4. Explain what makes these videos perform well

Focus on: filmmaking techniques, production workflows, collaboration tools, creator economy, video editing.

Format as JSON:
[
  {
    "topic": "Specific topic name",
    "why_trending": "Detailed explanation",
    "video_examples": [
      {
        "title": "Exact YouTube video title",
        "url": "https://youtube.com/watch?v=...",
        "channel": "Channel name",
        "views": 125000,
        "likes": 5400,
        "why_it_performed": "Specific reason this video succeeded"
      }
    ],
    "engagement_pattern": "What makes these videos succeed"
  }
]`,
    
    lunim: `What are the top 5 trending topics in creative technology and AI tools right now?

For each topic:
1. Explain why it's trending
2. Provide 5-8 actual YouTube video examples with exact titles and URLs
3. Include engagement metrics (views, likes) if available
4. Explain what makes these videos perform well

Focus on: AI tools for creatives, design thinking, workflow automation, creative tech adoption.

Format as JSON:
[
  {
    "topic": "Specific topic name",
    "why_trending": "Detailed explanation",
    "video_examples": [
      {
        "title": "Exact YouTube video title",
        "url": "https://youtube.com/watch?v=...",
        "channel": "Channel name",
        "views": 125000,
        "likes": 5400,
        "why_it_performed": "Specific reason this video succeeded"
      }
    ],
    "engagement_pattern": "What makes these videos succeed"
  }
]`,

    general: `What are the top 5 trending topics in content creation and digital media right now?

For each topic:
1. Explain why it's trending
2. Provide 5-8 actual YouTube video examples with exact titles and URLs
3. Include engagement metrics (views, likes) if available
4. Explain what makes these videos perform well

Focus on: content creation strategies, platform trends, audience growth, creator tools.

Format as JSON:
[
  {
    "topic": "Specific topic name",
    "why_trending": "Detailed explanation",
    "video_examples": [
      {
        "title": "Exact YouTube video title",
        "url": "https://youtube.com/watch?v=...",
        "channel": "Channel name",
        "views": 125000,
        "likes": 5400,
        "why_it_performed": "Specific reason this video succeeded"
      }
    ],
    "engagement_pattern": "What makes these videos succeed"
  }
]`
  };

  return queries[mode];
}

private getTrendingSystemPrompt(mode: 'tabb' | 'lunim' | 'general'): string {
  return `You are a research analyst identifying current trending topics with real video examples.

CRITICAL REQUIREMENTS:
- All video examples MUST be real YouTube videos with actual URLs
- Use current data from the last 3 months
- Verify all URLs are valid and working
- Include actual engagement metrics (views, likes)
- Explain specifically why each video performed well
- Do NOT use placeholder URLs or made-up titles
- Return ONLY valid JSON, no markdown formatting

Mode: ${mode}`;
}

private parseTrendingTopics(content: string): TrendingTopic[] {
  try {
    let cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('No JSON array found in trending topics response');
      return [];
    }

    const topics = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(topics)) {
      console.warn('Trending topics response is not an array');
      return [];
    }

    return topics.map((topic: any) => ({
      topic: topic.topic || 'Unknown Topic',
      why_trending: topic.why_trending || '',
      video_examples: (topic.video_examples || []).map((video: any) => ({
        title: video.title || '',
        url: video.url || '',
        channel: video.channel || '',
        views: video.views || 0,
        likes: video.likes || 0,
        why_it_performed: video.why_it_performed || ''
      })),
      engagement_pattern: topic.engagement_pattern || ''
    }));
  } catch (error) {
    console.error('Failed to parse trending topics:', error);
    return [];
  }
}
}

interface ExtractedTopic {
  text: string;
  keywords: string[];
  focusAreas: string[];
  relevance: number;
}