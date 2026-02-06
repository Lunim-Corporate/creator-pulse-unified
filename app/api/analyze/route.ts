import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AnalysisSchema } from "./utils/schema";
import { AnalysisPipeline } from "@/lib/services/AnalysisPipeline";
import { validateConfig } from "@/lib/config/api.config";
import { handleApiError } from "@/lib/utils/error";

const AnalyzeRequestSchema = z.object({
  posts: z.array(z.any()).min(1, "At least one post is required"),
  prompt: z.string().optional(),
  mode: z.enum(['tabb', 'lunim', 'general']),
  options: z.object({
    enrichWithPerplexity: z.boolean().default(true),
    minEngagementTargets: z.number().min(5).max(50).default(15),
    includeTrends: z.boolean().default(true)
  }).optional()
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    validateConfig();

    const body = await request.json();
    const validationResult = AnalyzeRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid request",
          details: validationResult.error.format()
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const { posts, prompt, mode, options } = validationResult.data;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Analysis Request: ${mode.toUpperCase()} mode`);
    console.log(`Posts: ${posts.length}`);
    console.log(`Prompt: ${prompt ? 'Yes' : 'No'}`);
    console.log(`Perplexity: ${options?.enrichWithPerplexity !== false ? 'Enabled' : 'Disabled'}`);
    console.log('='.repeat(60));

    const pipeline = new AnalysisPipeline();
    const result = await pipeline.execute({
      posts,
      prompt,
      mode,
      options
    });

    const parsed = AnalysisSchema.safeParse(result);
    
    if (!parsed.success) {
      console.error("Schema validation failed:", parsed.error.format());
      return NextResponse.json(
        {
          error: "Analysis result failed validation",
          details: parsed.error.format(),
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const processingTime = Date.now() - startTime;
    console.log(`\n✓ Analysis complete in ${processingTime}ms`);
    console.log(`  - Insights: ${parsed.data.content_performance_insights.length}`);
    console.log(`  - Targets: ${parsed.data.engagement_targets.length}`);
    console.log(`  - Recommendations: ${parsed.data.strategic_recommendations.length}`);

    console.log('\n📦 RESPONSE CHECK:');
    console.log('  - Has _metadata:', !!parsed.data._metadata);
    console.log('  - Has _qualityScore:', !!parsed.data._qualityScore);
    console.log('  - Metadata content:', JSON.stringify(parsed.data._metadata, null, 2));
    console.log('  - Quality score:', parsed.data._qualityScore?.overall);


    console.log('='.repeat(60) + '\n');

    return NextResponse.json(parsed.data, {
      status: 200,
      headers: {
        ...corsHeaders,
        'X-Processing-Time': `${processingTime}ms`,
        'X-Mode': mode,
        'X-Perplexity-Used': result._metadata?.perplexityUsed ? 'true' : 'false'
      }
    });

  } catch (error: any) {
    console.error("\n" + "=".repeat(60));
    console.error("Analysis Error:", error);
    console.error("=".repeat(60) + "\n");
    
    const errorResponse = handleApiError(error);
    
    return NextResponse.json(
      errorResponse,
      { 
        status: error.statusCode || 500, 
        headers: corsHeaders 
      }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 60; 