import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Received job creation request');
    const { posts, prompt, mode, options } = await request.json();
    console.log(`Posts count: ${posts?.length}, Mode: ${mode}`);

    const { data: job, error } = await supabase
      .from('analysis_jobs')
      .insert({
        status: 'pending',
        mode,
        prompt,
        posts: posts,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      throw error;
    }

    console.log(`✅ Created job: ${job.id}`);

    // Trigger processing
    const processUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/jobs/process`;
    console.log(`🚀 Triggering processing at: ${processUrl}`);
    
    fetch(processUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, posts, prompt, mode, options })
    })
    .then(() => console.log('✅ Process trigger sent'))
    .catch(err => console.error('❌ Failed to trigger processing:', err));

    return NextResponse.json({ jobId: job.id, status: 'pending' });
  } catch (error) {
    console.error('❌ Failed to create job:', error);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 10;