
export interface ScrapedPost {
  id: string;
  platform: 'reddit' | 'youtube' | 'facebook';
  creator_handle: string;
  content: string;
  post_link: string;
  timestamp: string;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
  metadata?: {
    source?: 'youtube' | 'reddit' | 'facebook' | 'perplexity'; 
    verified?: boolean; 
    originalPlatform?: string; 
    scrapedAt?: string;
    query?: string;
    [key: string]: any; 
  };
  _sources?: string[]; 
  _qualityScore?: number; 
}

export interface SupportingExample {
  title: string;
  link: string;
}

export interface ContentPerformanceInsight {
  topic: string;
  why_it_performed: string;
  supporting_examples: SupportingExample[];
  engagement_pattern: string;
}

export interface AnalysisResult {
  content_performance_insights: ContentPerformanceInsight[];

  audience_analysis: {
    estimated_people_talking: number;
    audience_segments: string[];
    sentiment_summary: string;
    interest_drivers: string[];
  };

  strategic_recommendations: Array<{
    recommendation: string;
    reasoning: string;
    expected_outcome: string;
  }>;

  automation_spots: Array<{
    task: string;
    why_automation_helps: string;
    proposed_automation_flow: string;
  }>;

  next_steps: Array<{
    step: string;
    priority: "high" | "medium" | "low";
    expected_impact: string;
  }>;

  engagement_targets: Array<{
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
  }>;

  top_talking_points: Array<{
    topic: string;
    what_people_are_saying: string;
    keywords: string[];
    growth_trend: string;
  }>;

  _metadata?: {
    processingTime: number;
    postsAnalyzed: number;
    perplexityUsed: boolean;
    perplexityScrapedPosts?: number; // NEW: How many posts came from Perplexity scraping
    enrichmentSources: string[];
    generatedAt: string;
    mode: string;
  };

  _qualityScore?: any; 
}