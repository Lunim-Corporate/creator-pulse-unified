
export interface ContentPerformanceInsight {
  topic: string;
  why_it_performed: string;
  supporting_examples: {
      title: string;
      link: string;
    }[];
  engagement_pattern: string;
}

export interface AudienceAnalysis {
  estimated_people_talking: number;
  audience_segments: string[];
  sentiment_summary: string;
  interest_drivers: string[];
}

export interface StrategicRecommendation {
  recommendation: string;
  reasoning: string;
  expected_outcome: string;
}

export interface AutomationSpot {
  task: string;
  why_automation_helps: string;
  proposed_automation_flow: string;
}

export interface NextStep {
  step: string;
  priority: "high" | "medium" | "low";
  expected_impact: string;
}

export interface EngagementTarget {
  creator_handle: string;
  platform: string;
  post_link: string;
  summary: string;
  recommended_engagement: string;
  pain_point_match: string;
  example_outreach: string;
  relevance_score: number;
  creator_tier: string;
  followers_estimate: number;
  is_verified: boolean;
}

export interface TalkingPoint {
  topic: string;
  what_people_are_saying: string;
  keywords: string[];
  growth_trend: string;
}

export interface AnalysisResponse {
  content_performance_insights: ContentPerformanceInsight[];
  audience_analysis: AudienceAnalysis;
  strategic_recommendations: StrategicRecommendation[];
  automation_spots: AutomationSpot[];
  next_steps: NextStep[];
  engagement_targets: EngagementTarget[];
  top_talking_points: TalkingPoint[];
}
