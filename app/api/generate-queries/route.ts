// app/api/generate-queries/route.ts - FIXED for better targeting
import { NextRequest, NextResponse } from "next/server";
import { normalizeClearPrompt } from "../../../lib/clear/normalizeclear";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { prompt, mode } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Enhanced system prompt with MUCH more specific instructions
    const system = `You generate highly targeted search queries for social platforms.

Mode: ${mode}

${mode === 'tabb' ? `
TABB MODE - FILMMAKING FOCUS:
Your queries MUST focus on:
- Independent filmmakers and content creators
- Video production and post-production
- Filmmaking workflows and processes
- Crew coordination and collaboration
- Video editing and color grading
- Camera equipment and techniques
- Film project management
- Director, DP, editor, producer challenges

REQUIRED KEYWORDS IN QUERIES:
- For YouTube: Include "filmmaking", "video production", "film", "director", "cinematography", "editing"
- For Reddit: Generate queries WITHOUT subreddit names (the scraper handles subreddits)
  Example: "filmmaking collaboration" NOT "filmmaking in r/Filmmakers"
- For Facebook: Focus on film production groups

EXAMPLE GOOD QUERIES:
- "independent filmmaking collaboration tools"
- "video production workflow challenges"
- "film crew coordination remote"
- "editing workflow for filmmakers"
- "cinematography techniques indie films"

AVOID:
- Generic "marketing" or "business" queries
- Non-film content creation
- Social media influencer content
- General productivity topics
` : `
LUNIM MODE - CREATIVE TECH FOCUS:
Your queries MUST focus on:
- AI tools for creative work
- Design thinking and innovation
- Creative technology adoption
- Digital transformation in creative industries
- Design systems and workflows
- Strategic technology integration
- Future-facing creativity tools

REQUIRED KEYWORDS IN QUERIES:
- For YouTube: Include "creative AI", "design technology", "innovation", "creative tools"
- For Reddit: Focus on r/Design, r/CreativeCoding, r/artificial, r/MachineLearning
- For Facebook: Design and tech innovation groups

EXAMPLE GOOD QUERIES:
- "AI tools for designers"
- "creative technology workflow"
- "design thinking innovation"
- "AI creative automation"

AVOID:
- Generic tech news
- Pure coding/dev content
- Consumer AI apps
- General business tech
`}

CRITICAL RULES:
1. Every query MUST include domain-specific keywords
2. Queries should be 3-6 words (specific enough to filter)
3. NO generic words like "best tools" or "software"
4. Focus on PAIN POINTS and WORKFLOWS
5. For Reddit: queries will search within specific subreddits
6. For YouTube: queries need to be descriptive to find right videos
7. Generate 3-5 queries per platform (not 10+)

Return STRICT JSON:
{
  "youtube": ["query1", "query2", "query3"],
  "reddit": ["query1", "query2", "query3"],
  "facebook": ["query1", "query2"]
}

Each array should have 3-5 highly targeted queries.`;

    const clear = await normalizeClearPrompt(prompt, mode);
    
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower for more consistent results
      messages: [
        { role: "system", content: system },
        { 
          role: "user", 
          content: `User prompt: "${prompt}"

C.L.E.A.R. context:
- Audience: ${clear.context.audience}
- Goal: ${clear.context.goal}

Generate 3-5 highly specific search queries per platform that will find ${mode === 'tabb' ? 'filmmaking and video production' : 'creative technology and design innovation'} content.` 
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const queries = JSON.parse(content);

    console.log('\n' + '='.repeat(60));
    console.log('GENERATED QUERIES FOR', mode.toUpperCase());
    console.log('='.repeat(60));
    console.log('YouTube:', queries.youtube);
    console.log('Reddit:', queries.reddit);
    console.log('Facebook:', queries.facebook);
    console.log('='.repeat(60) + '\n');

    return NextResponse.json(queries);
  } catch (err) {
    console.error("Query generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate search queries" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";