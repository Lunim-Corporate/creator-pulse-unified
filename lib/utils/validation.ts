
import type { ScrapedPost } from '../scrapers/types';


export function isValidPost(post: any): post is ScrapedPost {
  return !!(
    post &&
    typeof post === 'object' &&
    post.id &&
    post.platform &&
    post.creator_handle &&
    post.content &&
    typeof post.content === 'string' &&
    post.content.length > 10 &&
    post.post_link &&
    post.timestamp
  );
}

export function validatePosts(posts: any[]): ScrapedPost[] {
  if (!Array.isArray(posts)) {
    return [];
  }

  return posts.filter(isValidPost);
}

export function deduplicatePosts(posts: ScrapedPost[]): ScrapedPost[] {
  const seen = new Set<string>();
  
  return posts.filter(post => {
    const key = `${post.platform}:${post.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function sanitizePost(post: ScrapedPost): ScrapedPost {
  return {
    ...post,
    content: post.content
      .replace(/\s+/g, ' ') 
      .replace(/\n{3,}/g, '\n\n') 
      .trim()
  };
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function hasValidEngagement(post: ScrapedPost): boolean {
  if (!post.engagement) return false;
  
  const { likes = 0, comments = 0, shares = 0, views = 0 } = post.engagement;
  
  return (
    (likes >= 0 || comments >= 0 || shares >= 0 || views >= 0) &&
    (likes > 0 || comments > 0 || shares > 0 || views > 0)
  );
}


export function sortByEngagement(posts: ScrapedPost[]): ScrapedPost[] {
  return [...posts].sort((a, b) => {
    const scoreA = calculateEngagementScore(a);
    const scoreB = calculateEngagementScore(b);
    return scoreB - scoreA;
  });
}

export function calculateEngagementScore(post: ScrapedPost): number {
  if (!post.engagement) return 0;
  
  const { likes = 0, comments = 0, shares = 0, views = 0 } = post.engagement;
  
  return (
    comments * 10 +
    shares * 5 +
    likes * 2 +
    views * 0.01
  );
}


export function filterByEngagement(
  posts: ScrapedPost[],
  minScore: number = 10
): ScrapedPost[] {
  return posts.filter(post => calculateEngagementScore(post) >= minScore);
}

export function isNonEmptyString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function hasMinimumAnalysisData(analysis: any): boolean {
  return !!(
    analysis &&
    analysis.content_performance_insights?.length >= 3 &&
    analysis.audience_analysis &&
    analysis.strategic_recommendations?.length >= 3 &&
    analysis.engagement_targets?.length >= 10
  );
}

export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>]/g, '') 
    .slice(0, 200); 
}


export function isValidMode(mode: any): mode is 'tabb' | 'lunim' {
  return mode === 'tabb' || mode === 'lunim';
}


export function isValidPlatform(platform: any): platform is 'youtube' | 'reddit' | 'facebook' {
  return platform === 'youtube' || platform === 'reddit' || platform === 'facebook';
}