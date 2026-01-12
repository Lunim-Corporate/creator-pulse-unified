export const API_CONFIG = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
    fallbackModel: 'gpt-4o-mini',
    maxTokens: 4000,
    temperature: 0.7
  },
  
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY || '',
    model: 'sonar-pro',
    maxTokens: 4000,
    temperature: 0.2,
    enabled: !!process.env.PERPLEXITY_API_KEY
  },

  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY!,
    maxResults: 25,
    orderBy: 'relevance' as const
  },

  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
    username: process.env.REDDIT_USERNAME || '',
    password: process.env.REDDIT_PASSWORD || '',
    enabled: !!(
      process.env.REDDIT_CLIENT_ID &&
      process.env.REDDIT_CLIENT_SECRET &&
      process.env.REDDIT_USERNAME &&
      process.env.REDDIT_PASSWORD
    )
  },

  facebook: {
    accessToken: process.env.FACEBOOK_ACCESS_TOKEN || '',
    enabled: !!process.env.FACEBOOK_ACCESS_TOKEN
  },

  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
  }
};

export function validateConfig() {
  const required = {
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
    'YOUTUBE_API_KEY': process.env.YOUTUBE_API_KEY,
    'SUPABASE_URL': process.env.SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const optional = {
    'PERPLEXITY_API_KEY': process.env.PERPLEXITY_API_KEY,
    'REDDIT_CLIENT_ID': process.env.REDDIT_CLIENT_ID,
    'FACEBOOK_ACCESS_TOKEN': process.env.FACEBOOK_ACCESS_TOKEN
  };

  const warnings = Object.entries(optional)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (warnings.length > 0) {
    console.warn(`Optional environment variables not set: ${warnings.join(', ')}`);
  }
}