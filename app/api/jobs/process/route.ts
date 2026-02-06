import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { AnalysisPipeline } from "@/lib/services/AnalysisPipeline";

export async function POST(request: NextRequest) {
  try {
    const { jobId, posts, prompt, mode, options } = await request.json();
    
    console.log(`📨 Received process request for job: ${jobId}`);

    // Immediately return success
    const response = NextResponse.json({ success: true });

    // Start processing AFTER response is sent (use setImmediate equivalent)
    setTimeout(() => {
      processJob(jobId, posts, prompt, mode, options);
    }, 0);

    return response;

  } catch (error) {
    console.error('Process route error:', error);
    return NextResponse.json({ error: 'Failed to start processing' }, { status: 500 });
  }
}

async function processJob(
  jobId: string, 
  posts: any[], 
  prompt: string, 
  mode: string, 
  options: any
) {
  try {
    console.log(`🔄 Starting processing for job ${jobId}...`);

    // Update to processing
    await supabase
      .from('analysis_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    console.log(`  ✓ Job ${jobId} status updated to processing`);

    // Run the analysis
    const pipeline = new AnalysisPipeline();
    const result = await pipeline.execute({
      posts,
      prompt,
      mode: mode as any,
      options
    });

    console.log(`  ✓ Job ${jobId} analysis complete`);

    // Save result
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'completed',
        result: result,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`✅ Job ${jobId} completed successfully`);
  } catch (error: any) {
    console.error(`❌ Job ${jobId} failed:`, error);
    
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'failed',
        error: error.message || 'Unknown error',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

export const runtime = "nodejs";
export const maxDuration = 300;