export function extractEngagementTargets(posts: any[]) {
  const map = new Map<string, any>();

  for (const post of posts) {
    const key = `${post.platform}:${post.creator_handle}`;

    if (!map.has(key)) {
      map.set(key, {
        creator_handle: post.creator_handle,
        platform: post.platform,
        post_link: post.post_link,
        summary: post.content.slice(0, 240),
        relevance_score: 0,
      });
    }
  }

  return Array.from(map.values());
}

