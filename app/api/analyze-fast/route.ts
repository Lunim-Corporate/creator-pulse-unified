import { NextRequest, NextResponse } from "next/server";
import { AnalysisPipeline } from "@/lib/services/AnalysisPipeline";
import { validateConfig } from "@/lib/config/api.config";

export async function POST(request: NextRequest) {
  try {
    validateConfig();

    const { posts, prompt, mode } = await request.json();

    console.log(` Fast analysis: ${posts.length} posts, mode: ${mode}`);

    const pipeline = new AnalysisPipeline();
    const result = await pipeline.execute({
      posts: posts.slice(0, 50), 
      prompt,
      mode,
      options: {
        enrichWithPerplexity: false, 
        minEngagementTargets: 15,
        includeTrends: false
      }
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Analysis failed:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 10; 