export function resolveEngagementStrategy(summary: string) {
  const hasQuestion =
    summary.includes("?") ||
    /\b(how|why|what|anyone|help)\b/i.test(summary);

  const isPersonal =
    /\b(i|my|me|we|our)\b/i.test(summary);

  const isFrustrated =
    /\b(struggle|stuck|hard|frustrat|issue|problem)\b/i.test(summary);

  let score = 0;
  if (hasQuestion) score += 2;
  if (isPersonal) score += 1;
  if (isFrustrated) score += 1;

  if (score >= 3) {
    return {
      recommended_engagement: "1:1 reply",
      pain_point_match: "Personal or high-friction workflow pain",
    };
  }

  return {
    recommended_engagement: "Public comment",
    pain_point_match: "General insight or shared experience",
  };
}
