import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const { data: job, error } = await supabase
      .from('analysis_jobs')
      .select('id, status, result, error, created_at, completed_at')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 10;