import { z } from "zod";

export const AnalysisSchema = z.object({
  content_performance_insights: z.array(
    z.object({
      topic: z.string(),
      why_it_performed: z.string(),
      supporting_examples: z.array(
        z.object({
          title: z.string(),
          link: z.string()
        })
      ),
      engagement_pattern: z.string(),
      _enriched: z.boolean().optional() 
    })
  ),
  audience_analysis: z.object({
    estimated_people_talking: z.number(),
    audience_segments: z.array(z.string()),
    sentiment_summary: z.string(),
    interest_drivers: z.array(z.string())
  }),
  strategic_recommendations: z.array(
    z.object({
      recommendation: z.string(),
      reasoning: z.string(),
      expected_outcome: z.string()
    })
  ),
  automation_spots: z.array(
    z.object({
      task: z.string(),
      why_automation_helps: z.string(),
      proposed_automation_flow: z.string()
    })
  ),
  next_steps: z.array(
    z.object({
      step: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      expected_impact: z.string()
    })
  ),
  engagement_targets: z.array(
    z.object({
      creator_handle: z.string(),
      platform: z.string(),
      post_link: z.string(),
      summary: z.string(),
      recommended_engagement: z.string(),
      pain_point_match: z.string(),
      example_outreach: z.string(),
      relevance_score: z.number(),
      creator_tier: z.string(),
      followers_estimate: z.number(),
      is_verified: z.boolean()
    })
  ),
  top_talking_points: z.array(
    z.object({
      topic: z.string(),
      what_people_are_saying: z.string(),
      keywords: z.array(z.string()),
      growth_trend: z.string()
    })
  ),
  
  _metadata: z.object({
    processingTime: z.number(),
    postsAnalyzed: z.number(),
    perplexityUsed: z.boolean(),
    enrichmentSources: z.array(z.string()),
    generatedAt: z.string(),
    mode: z.string()
  }).optional(),
  
  _qualityScore: z.any().optional() 
});