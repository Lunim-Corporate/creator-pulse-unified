import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode");

  if (mode !== "tabb" && mode !== "lunim") {
    return NextResponse.json(
      { error: "Invalid mode" },
      { status: 400, headers: corsHeaders }
    );
  }

  const { data, error } = await supabase
    .from("saved_prompts")
    .select("*")
    .eq("mode", mode)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }

  return NextResponse.json(data, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const { action } = payload;

  if (!action) {
    return NextResponse.json(
      { error: "Missing action" },
      { status: 400, headers: corsHeaders }
    );
  }

  if (action === "create") {
    const { mode, label, prompt } = payload;

    if (!mode || !label || !prompt) {
      return NextResponse.json(
        { error: "Missing fields for create" },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data, error } = await supabase
      .from("saved_prompts")
      .insert([{ mode, label, prompt }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(data, { headers: corsHeaders });
  }

 
  if (action === "delete") {
    const { id } = payload;

    if (!id) {
      return NextResponse.json(
        { error: "Missing id for delete" },
        { status: 400, headers: corsHeaders }
      );
    }

    const { error } = await supabase
      .from("saved_prompts")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  }

  return NextResponse.json(
    { error: "Invalid action" },
    { status: 400, headers: corsHeaders }
  );
}
