import { NextRequest, NextResponse } from "next/server";
import { Client } from "@upstash/qstash";
import { supabase } from "@/lib/supabase";

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!
});

export async function POST(request: NextRequest) {
  try {
    const { posts, prompt, mode } = await request.json();

    // Create job
    const { data: job, error } = await supabase
      .from('analysis_jobs')
      .insert({
        status: 'queued',
        mode,
        prompt,
        posts
      })
      .select()
      .single();

    if (error) throw error;

    // Queue it
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    await qstash.publishJSON({
      url: `${baseUrl}/api/analyze/queue`,
      body: {
        jobId: job.id,
        posts,
        prompt,
        mode
      }
    });

    console.log(`✅ Job ${job.id} queued via QStash`);

    return NextResponse.json({ 
      jobId: job.id, 
      status: 'queued' 
    });

  } catch (error: any) {
    console.error('Failed to queue:', error);
    return NextResponse.json(
      { error: 'Failed to start analysis' },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 10;