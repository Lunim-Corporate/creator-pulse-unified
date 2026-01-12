// UPDATE app/api/scrape/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getScraperFactory } from "@/lib/scrapers/ScraperFactory";
import { handleApiError } from "@/lib/utils/error";

interface ScrapeQueries {
  youtube?: string[];
  reddit?: string[];
  facebook?: string[];
  perplexity?: string[]; // NEW: Optional Perplexity queries
}

export async function POST(req: NextRequest) {
  try {
    const { queries, mode }: { queries: ScrapeQueries; mode?: 'tabb' | 'lunim' } = await req.json();

    if (!queries) {
      return NextResponse.json(
        { error: "queries are required" },
        { status: 400 }
      );
    }

    console.log('\n' + '='.repeat(60));
    console.log(`SCRAPING REQUEST - Mode: ${mode || 'tabb'}`);
    console.log('='.repeat(60));
    console.log('YouTube queries:', queries.youtube?.length || 0);
    console.log('Reddit queries:', queries.reddit?.length || 0);
    console.log('Facebook queries:', queries.facebook?.length || 0);
    console.log('Perplexity queries:', queries.perplexity?.length || 'auto (will use YouTube queries)');

    // Get factory with mode support
    const factory = getScraperFactory(mode);
    
    // Show status report
    console.log(factory.getStatusReport());

    // Scrape all platforms (including Perplexity)
    const result = await factory.scrapeAll(queries);

    console.log('\n' + '='.repeat(60));
    console.log('SCRAPING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total posts collected: ${result.posts.length}`);
    console.log(`YouTube: ${result.stats.youtube.count} posts (${result.stats.youtube.method})`);
    console.log(`Reddit: ${result.stats.reddit.count} posts (${result.stats.reddit.method})`);
    console.log(`Facebook: ${result.stats.facebook.count} posts (${result.stats.facebook.method})`);
    console.log(`Perplexity: ${result.stats.perplexity.count} posts (${result.stats.perplexity.method})`);
    
    if (result.failures.length > 0) {
      console.log(`Failures: ${result.failures.join(', ')}`);
    }
    
    // Quality distribution
    const qualityBreakdown = {
      verified: result.posts.filter(p => p.metadata?.verified).length,
      multiSource: result.posts.filter(p => p._sources && p._sources.length > 1).length,
      highQuality: result.posts.filter(p => (p._qualityScore || 0) > 70).length
    };
    console.log('\nQuality Breakdown:');
    console.log(`  Verified by Perplexity: ${qualityBreakdown.verified}`);
    console.log(`  Multi-source posts: ${qualityBreakdown.multiSource}`);
    console.log(`  High quality (>70 score): ${qualityBreakdown.highQuality}`);
    
    console.log('='.repeat(60) + '\n');

    // Check if we got any data
    if (result.posts.length === 0) {
      console.error('✗ No data collected from any platform');
      return NextResponse.json(
        {
          error: "No data could be collected from any platform",
          failures: result.failures,
          stats: result.stats,
          statusReport: factory.getStatusReport()
        },
        { status: 500 }
      );
    }

    // Build enhanced response
    const response = {
      posts: result.posts,
      failures: result.failures,
      stats: result.stats,
      metadata: {
        totalPosts: result.posts.length,
        platformBreakdown: result.stats,
        scrapingMethods: {
          youtube: result.stats.youtube.method,
          reddit: result.stats.reddit.method,
          facebook: result.stats.facebook.method,
          perplexity: result.stats.perplexity.method
        },
        quality: qualityBreakdown,
        warnings: generateWarnings(result.stats),
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (err) {
    console.error("\n✗ Scrape API fatal error:", err);
    const errorResponse = handleApiError(err);
    
    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}

function generateWarnings(stats: Record<string, { count: number; method: string }>): string[] {
  const warnings: string[] = [];

  if (stats.reddit.method === 'rss') {
    warnings.push('Reddit: Using RSS fallback (limited data). Configure Reddit API for better results.');
  }

  if (stats.facebook.method === 'public' || stats.facebook.method === 'mock') {
    warnings.push('Facebook: Using public scraper (very limited). Configure Facebook Graph API for real data.');
  }

  if (stats.perplexity.method === 'none' || stats.perplexity.count === 0) {
    warnings.push('Perplexity: Not configured or returned no results. Add PERPLEXITY_API_KEY for AI-enhanced scraping.');
  }

  if (stats.youtube.count === 0 && stats.reddit.count === 0 && stats.facebook.count === 0 && stats.perplexity.count === 0) {
    warnings.push('No data collected from any platform. Check your API configurations.');
  }

  return warnings;
}

export const runtime = "nodejs";