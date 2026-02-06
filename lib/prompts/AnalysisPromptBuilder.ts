
import type { ClearPrompt } from '../clear/normalizeclear';
import { generateClearPromptSection } from '../clear/normalizeclear';
import type { EnrichedData } from '../services/PerplexityService';

const TABB_BASE_PROMPT = `You are Creator Pulse for Tabb.

Tabb is a project-centred professional network for filmmakers and creative teams.

Tone: Professional, community-oriented, practical, marketing-ready
Focus: Creator workflows, collaboration pain points, community engagement, campaign hooks

You ALWAYS return strictly valid JSON with comprehensive insights.`;

const LUNIM_BASE_PROMPT = `You are Creator Pulse for Lunim Studio.

Lunim is an innovation-focused creative technology studio.

Tone: Visionary, strategic, forward-looking
Focus: Creative technology, AI systems, design thinking, brand narrative, long-term positioning

You ALWAYS return strictly valid JSON with strategic depth.`;

const GENERAL_BASE_PROMPT = `You are Creator Pulse in General mode.

Tone: Neutral, adaptable, data-driven
Focus: Cross-platform creator insights, general content analysis, universal creator trends

You ALWAYS return strictly valid JSON with comprehensive insights.`;

const RESPONSE_SCHEMA = `

RESPONSE SCHEMA (REQUIRED):
{
  "content_performance_insights": [
    {
      "topic": "Specific topic from actual posts (e.g., 'Color Grading Workflow for Indie Films')",
      "why_it_performed": "Analysis based on actual engagement metrics from the posts",
      "supporting_examples": [
        { 
          "title": "EXACT title from a real YouTube video or Reddit post", 
          "link": "ACTUAL URL from the scraped posts" 
        }
      ],
      "engagement_pattern": "Actual pattern observed in the data"
    }
  ],
  "audience_analysis": {
    "estimated_people_talking": number,
    "audience_segments": ["segment1", "segment2"],
    "sentiment_summary": "overall sentiment",
    "interest_drivers": ["driver1", "driver2"]
  },
  "strategic_recommendations": [
    {
      "recommendation": "specific recommendation",
      "reasoning": "why this matters",
      "expected_outcome": "what to expect"
    }
  ],
  "automation_spots": [
    {
      "task": "task description",
      "why_automation_helps": "benefits",
      "proposed_automation_flow": "step by step"
    }
  ],
  "next_steps": [
    {
      "step": "actionable step",
      "priority": "high|medium|low",
      "expected_impact": "impact description"
    }
  ],
  "engagement_targets": [
    {
      "creator_handle": "handle",
      "platform": "platform",
      "post_link": "URL",
      "summary": "post summary",
      "recommended_engagement": "engagement type",
      "pain_point_match": "pain point",
      "example_outreach": "sample message (2-3 sentences, reference the post)",
      "relevance_score": number,
      "creator_tier": "tier",
      "followers_estimate": number,
      "is_verified": boolean
    }
  ],
  "top_talking_points": [
    {
      "topic": "topic name",
      "what_people_are_saying": "summary",
      "keywords": ["keyword1", "keyword2"],
      "growth_trend": "trend description"
    }
  ]
}

CRITICAL REQUIREMENTS:
- content_performance_insights: minimum 5, each with 5-10 supporting_examples
- strategic_recommendations: minimum 4
- automation_spots: minimum 2
- engagement_targets: use provided targets, enrich with example_outreach
- example_outreach must reference the creator's specific post
- Never invent data not present in source material
- Each insight MUST be derived from ACTUAL scraped posts provided below
- The "topic" should be SPECIFIC (not generic like "Video Production Tips")
- supporting_examples MUST use REAL titles and REAL links from the scraped posts
- You MUST include 5-10 supporting_examples per insight, all from actual posts
- DO NOT invent video titles or URLs
- If a post has high engagement, analyze WHY based on the content

EXAMPLE OF GOOD INSIGHT:
{
  "topic": "DaVinci Resolve vs Premiere Pro Performance Comparison",
  "why_it_performed": "Video received 15K views and 250 comments because it provided side-by-side speed tests with actual render times",
  "supporting_examples": [
    {
      "title": "DaVinci Resolve 18 vs Premiere Pro 2024 - Speed Test",
      "link": "https://youtube.com/watch?v=abc123"
    },
    
  ],
  "engagement_pattern": "Technical comparison videos with quantifiable results drive comment discussions"
}

EXAMPLE OF BAD INSIGHT (DO NOT DO THIS):
{
  "topic": "Video Editing Tips",
  "why_it_performed": "People like tips",
  "supporting_examples": [
    {
      "title": "Industry Source 1",
      "link": "https://www.perplexity.ai"
    }
  ]
}
`;

export class AnalysisPromptBuilder {
  private static smartSamplePosts(posts: any[], targetCount: number): any[] {
    if (posts.length <= targetCount) {
      console.log(`Using all ${posts.length} posts (within limit)`);
      return posts;
    }
    
    console.log(`\n Smart Sampling: ${posts.length} posts → ${targetCount} posts`);
    
    const verified = posts.filter(p => 
      p.metadata?.verified || p._sources?.includes('perplexity')
    );
    
    const highQuality = posts.filter(p => 
      !p.metadata?.verified && 
      !p._sources?.includes('perplexity') &&
      (p._qualityScore || 0) > 70
    );
    
    const multiSource = posts.filter(p => 
      p._sources && p._sources.length > 1 &&
      !verified.includes(p) &&
      !highQuality.includes(p)
    );
    
    const rest = posts.filter(p => 
      !verified.includes(p) && 
      !highQuality.includes(p) &&
      !multiSource.includes(p)
    );
    
    const verifiedQuota = Math.min(verified.length, Math.floor(targetCount * 0.4)); 
    const highQualityQuota = Math.min(highQuality.length, Math.floor(targetCount * 0.3)); 
    const multiSourceQuota = Math.min(multiSource.length, Math.floor(targetCount * 0.15)); 
    const restQuota = targetCount - verifiedQuota - highQualityQuota - multiSourceQuota; 
    
    const selected = [
      ...verified.slice(0, verifiedQuota),
      ...highQuality.slice(0, highQualityQuota),
      ...multiSource.slice(0, multiSourceQuota),
      ...rest.slice(0, restQuota)
    ];
    
    console.log(`  ✓ ${verifiedQuota} Perplexity-verified (${verified.length} available)`);
    console.log(`  ✓ ${highQualityQuota} High-quality (${highQuality.length} available)`);
    console.log(`  ✓ ${multiSourceQuota} Multi-source (${multiSource.length} available)`);
    console.log(`  ✓ ${restQuota} Other posts (${rest.length} available)`);
    console.log(`  = ${selected.length} total posts selected\n`);
    
    return selected.slice(0, targetCount);
  }

  
  static buildSystemPrompt(
    mode: 'tabb' | 'lunim' | 'general',
    clearContext?: ClearPrompt,
    enrichedData?: EnrichedData
  ): string {
     let prompt = mode === 'tabb' 
    ? TABB_BASE_PROMPT 
    : mode === 'lunim'
    ? LUNIM_BASE_PROMPT
    : GENERAL_BASE_PROMPT;
    
    prompt += RESPONSE_SCHEMA;

    if (clearContext) {
      prompt += '\n\n' + generateClearPromptSection(clearContext);
    } else {
      prompt += `\n\n=== QUALITY GUIDELINES ===
- Base all insights on scraped content only
- Do not invent statistics or data
- Qualify claims appropriately ("many creators mention", "based on discussions")
- Provide specific examples with links
- Be actionable and practical
========================\n`;
    }

    if (enrichedData && enrichedData.trends.length > 0) {
      prompt += this.formatEnrichedData(enrichedData);
    }

    return prompt;
  }

  private static formatEnrichedData(enriched: EnrichedData): string {
    let section = `\n\n=== ENRICHED MARKET INTELLIGENCE ===\n`;
    section += `Use this current data to enhance your analysis:\n\n`;

    if (enriched.trends.length > 0) {
      section += `CURRENT TRENDS (from Perplexity):\n`;
      enriched.trends.slice(0, 8).forEach((trend, idx) => {
        section += `${idx + 1}. ${trend.topic}: ${trend.summary}\n`;
        section += `   Date: ${trend.date} | Relevance: ${Math.round(trend.relevanceScore * 100)}%\n`;
      });
      section += '\n';
    }

    if (enriched.verifiedFacts.length > 0) {
      section += `VERIFIED FACTS:\n`;
      enriched.verifiedFacts.slice(0, 10).forEach((fact, idx) => {
        section += `${idx + 1}. ${fact.claim}\n`;
        section += `   Confidence: ${Math.round(fact.confidence * 100)}%\n`;
        section += `   Sources: ${fact.sources.slice(0, 2).join(', ')}\n`;
      });
      section += '\n';
    }

    if (enriched.context.length > 0) {
      section += `CONTEXTUAL INSIGHTS:\n`;
      enriched.context.slice(0, 3).forEach((ctx, idx) => {
        section += `${idx + 1}. ${ctx.topic}:\n`;
        section += `   ${ctx.insight.slice(0, 200)}...\n`;
      });
      section += '\n';
    }

    section += `Use this enriched data to:\n`;
    section += `- Provide more current and accurate insights\n`;
    section += `- Reference real trends and verified facts\n`;
    section += `- Add market context to recommendations\n`;
    section += `- Support claims with recent data\n`;
    section += `========================================\n`;

    return section;
  }

 

static buildUserMessages(
  posts: any[],
  engagementTargets: any[],
  userPrompt?: string
): Array<{ role: 'user'; content: string }> {
  const messages: Array<{ role: 'user'; content: string }> = [];

  const limitedTargets = engagementTargets.slice(0, 25); 

  messages.push({
    role: 'user',
    content: `PRE-EXTRACTED ENGAGEMENT TARGETS:

CRITICAL: You MUST return AT LEAST ${Math.min(limitedTargets.length, 20)} engagement targets.
These targets have been pre-identified and ranked by relevance to the mode.
Return UP TO ${limitedTargets.length} targets maximum.

Your job is to enrich each with example_outreach that:
- References the specific post/comment
- Matches platform norms (YouTube comment style, Reddit reply style, etc.)
- Is 2-3 sentences maximum
- Does NOT include links or sales language

${JSON.stringify(limitedTargets, null, 2)}`
  });

  if (userPrompt) {
    messages.push({
      role: 'user',
      content: `RESEARCH INTENT: ${userPrompt}

Focus your analysis on this specific research question while following all C.L.E.A.R. guidelines.`
    });
  }

  const limitedPosts = this.smartSamplePosts(posts, 40);
  
  const postsText = limitedPosts
    .map(p => {
      const engagementInfo = p.engagement 
        ? `Engagement: ${JSON.stringify(p.engagement)}`
        : '';
      
      const qualityIndicators = [];
      if (p.metadata?.verified) qualityIndicators.push('✓ Perplexity Verified');
      if (p._sources && p._sources.length > 1) qualityIndicators.push(`✓ Multi-source (${p._sources.join(', ')})`);
      if (p._qualityScore && p._qualityScore > 70) qualityIndicators.push(`✓ High Quality (${p._qualityScore})`);
      
      const qualityBadge = qualityIndicators.length > 0 
        ? `\nQuality: ${qualityIndicators.join(' | ')}`
        : '';
      
      return `[${p.platform.toUpperCase()}] @${p.creator_handle}
Title/Topic: ${p.content.split('\n')[0]}
Content: ${p.content.slice(0, 500)}${p.content.length > 500 ? '...' : ''}
Link: ${p.post_link}
${engagementInfo}${qualityBadge}
Posted: ${p.timestamp}`;
    })
    .join('\n\n---\n\n');

  messages.push({
    role: 'user',
    content: `SCRAPED POSTS (${posts.length} total, showing ${limitedPosts.length} intelligently sampled):

${postsText}

Analyze these posts following the response schema and all quality guidelines.
Base all insights on this actual content - do not invent data.

REMINDER: Return ${Math.min(limitedTargets.length, 20)}-${limitedTargets.length} engagement targets with enriched outreach messages.`
  });

  return messages;
}
    
    static buildCompleteMessages(
      mode: 'tabb' | 'lunim' | 'general',
      posts: any[],
      engagementTargets: any[],
      clearContext?: ClearPrompt,
      enrichedData?: EnrichedData,
      userPrompt?: string
    ): Array<{ role: 'system' | 'user'; content: string }> {
      const systemPrompt = this.buildSystemPrompt(mode, clearContext, enrichedData);
      const userMessages = this.buildUserMessages(posts, engagementTargets, userPrompt);

      return [
        { role: 'system', content: systemPrompt },
        ...userMessages
      ];
    }
  }