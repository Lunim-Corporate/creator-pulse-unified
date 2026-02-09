import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { AnalysisPipeline } from "@/lib/services/AnalysisPipeline";
import { supabase } from "@/lib/supabase";

async function handler(request: NextRequest) {
  try {
    const { jobId, posts, prompt, mode } = await request.json();

    console.log(` Processing queued job: ${jobId}`);

    await supabase
      .from('analysis_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    const pipeline = new AnalysisPipeline();
    const result = await pipeline.execute({
      posts,
      prompt,
      mode,
      options: {
        enrichWithPerplexity: true,
        minEngagementTargets: 15,
        includeTrends: true
      }
    });

    await supabase
      .from('analysis_jobs')
      .update({
        status: 'completed',
        result,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(` Job ${jobId} completed`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Queue processing failed:', error);

    try {
      const { jobId } = await request.json();
      await supabase
        .from('analysis_jobs')
        .update({
          status: 'failed',
          error: error.message
        })
        .eq('id', jobId);
    } catch {}

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export const POST = verifySignatureAppRouter(handler);

export const runtime = "nodejs";
export const maxDuration = 300; 