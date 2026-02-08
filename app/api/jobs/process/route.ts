import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { AnalysisPipeline } from "@/lib/services/AnalysisPipeline";

export async function POST(request: NextRequest) {
  try {
    const { jobId, posts, prompt, mode, options } = await request.json();
    
    console.log(`📨 Received process request for job: ${jobId}`);

    const processPromise = processJob(jobId, posts, prompt, mode, options);
    
    const extendedRequest = request as any;
    if (typeof extendedRequest.waitUntil === 'function') {
      console.log('✅ Using Vercel waitUntil for background processing');
      extendedRequest.waitUntil(processPromise);
    } else {
      console.log('⚠️ waitUntil not available, processing in background via Promise');
      processPromise.catch(err => console.error('Background process error:', err));
    }

    return NextResponse.json({ success: true, jobId });

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
): Promise<void> {
  try {
    console.log(`🔄 Starting background processing for job ${jobId}...`);
    const startTime = Date.now();

    const { error: updateError } = await supabase
      .from('analysis_jobs')
      .update({ 
        status: 'processing', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', jobId);

    if (updateError) {
      throw new Error(`Failed to update job status: ${updateError.message}`);
    }

    console.log(`  ✓ Job ${jobId} status updated to processing`);

    // Run the analysis
    const pipeline = new AnalysisPipeline();
    const result = await pipeline.execute({
      posts,
      prompt,
      mode: mode as any,
      options
    });

    const processingTime = Date.now() - startTime;
    console.log(`  ✓ Job ${jobId} analysis complete in ${(processingTime / 1000).toFixed(1)}s`);

    const { error: saveError } = await supabase
      .from('analysis_jobs')
      .update({
        status: 'completed',
        result: result,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (saveError) {
      throw new Error(`Failed to save result: ${saveError.message}`);
    }

    console.log(`✅ Job ${jobId} completed successfully (total time: ${(processingTime / 1000).toFixed(1)}s)`);
    
  } catch (error: any) {
    console.error(`❌ Job ${jobId} failed:`, error);
    console.error('Error stack:', error.stack);
    
    // Try to update job to failed status
    try {
      await supabase
        .from('analysis_jobs')
        .update({
          status: 'failed',
          error: error.message || 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      console.log(`  ✓ Job ${jobId} marked as failed in database`);
    } catch (updateError) {
      console.error(`  ✗ Failed to update job ${jobId} to failed status:`, updateError);
    }
    
    throw error;
  }
}

export const runtime = "nodejs";
export const maxDuration = 300;