
import OpenAI from "openai";

export interface ClearPrompt {
  context: {
    audience: string;
    goal: string;
    channel: string[];
    voice: string;
  };
  limits: {
    noInventedFacts: boolean;
    noWildPromises: boolean;
    forbiddenClaims: string[];
    evidenceRequired: string[];
  };
  ethics: {
    flagShakyClaims: boolean;
    inclusiveLanguage: boolean;
    avoidStereotypes: boolean;
  };
  acceptanceCriteria: string[];
  reviewPath: {
    labelNewStats: boolean;
    labelPerformanceClaims: boolean;
    evidenceLabels: string[];
  };
}

export async function normalizeClearPrompt(
  rawPrompt: string,
  mode: "tabb" | "lunim"
): Promise<ClearPrompt> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  const system = `You are converting a research prompt into the C.L.E.A.R. framework.

C.L.E.A.R. Framework (from Lunim methodology):
**C**ontext: Who this is for, the goal, channel, voice
**L**imits: No invented facts, no wild promises, clear boundaries
**E**thics: Flag shaky claims, use inclusive language
**A**cceptance criteria: What must be true for this to be usable
**R**eview path: Label any stats or performance claims that need evidence

Mode: ${mode}

${mode === 'tabb' 
  ? `Tabb Context:
- Audience: Filmmakers, content creators, production teams
- Goal: Understand collaboration pain points and workflow challenges
- Voice: Practical, community-oriented, supportive
- Channels: YouTube (tutorials, workflows), Reddit (questions, discussions)
- Forbidden: Invented statistics, unverifiable claims about "best" or "#1"
- Required: Real examples from actual creators, specific pain points`
  : `Lunim Context:
- Audience: Innovation leaders, design teams, strategic decision-makers
- Goal: Identify creative technology trends and strategic opportunities
- Voice: Visionary, strategic, thoughtful, experimental
- Channels: YouTube (tech talks, case studies), Reddit (innovation discussions)
- Forbidden: AI hype, buzzwords without substance, overpromises
- Required: Evidence-based insights, systems thinking, measured analysis`
}

CRITICAL RULES:
1. No invented facts means: Don't claim statistics, percentages, or data points unless they come from scraped content
2. No wild promises means: Avoid "guaranteed," "always," "never," "best," "#1" without evidence
3. Flag shaky claims means: If something sounds too good, label it [Needs verification]
4. Evidence required means: Mark any performance claims as [Source: scraped content] or [Needs evidence]

Return STRICT JSON:
{
  "context": {
    "audience": "specific target audience",
    "goal": "research objective",
    "channel": ["platforms to research"],
    "voice": "brand tone description"
  },
  "limits": {
    "noInventedFacts": true,
    "noWildPromises": true,
    "forbiddenClaims": ["list of specific claims to avoid"],
    "evidenceRequired": ["types of claims that need sources"]
  },
  "ethics": {
    "flagShakyClaims": true,
    "inclusiveLanguage": true,
    "avoidStereotypes": true
  },
  "acceptanceCriteria": [
    "criteria for quality",
    "what makes this research usable"
  ],
  "reviewPath": {
    "labelNewStats": true,
    "labelPerformanceClaims": true,
    "evidenceLabels": [
      "Label stats as [Source: X]",
      "Label claims as [Needs verification] if uncertain"
    ]
  }
}`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: rawPrompt },
    ],
  });

  const result = JSON.parse(completion.choices[0].message.content!);
  return validateClear(result, mode);
}

function validateClear(prompt: any, mode: 'tabb' | 'lunim'): ClearPrompt {
  return {
    context: {
      audience: prompt.context?.audience || (mode === 'tabb' ? 'Filmmakers and content creators' : 'Innovation leaders and design teams'),
      goal: prompt.context?.goal || 'Understand key trends and pain points',
      channel: prompt.context?.channel || ['youtube', 'reddit'],
      voice: prompt.context?.voice || (mode === 'tabb' ? 'practical, supportive' : 'strategic, thoughtful')
    },
    limits: {
      noInventedFacts: true, // Always true
      noWildPromises: true, // Always true
      forbiddenClaims: prompt.limits?.forbiddenClaims || [
        'Unverified statistics',
        'Absolute claims without evidence',
        'Superlatives without proof (#1, best, guaranteed)'
      ],
      evidenceRequired: prompt.limits?.evidenceRequired || [
        'Statistics and percentages',
        'Performance claims',
        'Market share claims',
        'Superlatives'
      ]
    },
    ethics: {
      flagShakyClaims: true, // Always true
      inclusiveLanguage: true, // Always true
      avoidStereotypes: true // Always true
    },
    acceptanceCriteria: prompt.acceptanceCriteria || [
      'Insights are backed by scraped content',
      'Claims are qualified appropriately',
      'Recommendations are actionable',
      'Analysis aligns with brand voice'
    ],
    reviewPath: {
      labelNewStats: true, // Always true
      labelPerformanceClaims: true, // Always true
      evidenceLabels: prompt.reviewPath?.evidenceLabels || [
        'Mark statistics as [Source: scraped content] or [Needs verification]',
        'Flag superlatives with [Verify claim]',
        'Label performance promises as [Needs evidence]'
      ]
    }
  };
}


export function generateClearPromptSection(clear: ClearPrompt): string {
  return `
=== C.L.E.A.R. FRAMEWORK REQUIREMENTS ===

CONTEXT:
- Audience: ${clear.context.audience}
- Goal: ${clear.context.goal}
- Channels: ${clear.context.channel.join(', ')}
- Voice: ${clear.context.voice}

LIMITS (CRITICAL - NEVER VIOLATE):
- NO invented facts, statistics, or data points
- NO wild promises or unqualified guarantees
- NO superlatives without evidence (#1, best, leading, etc.)
- Forbidden claims: ${clear.limits.forbiddenClaims.join(', ')}
- Evidence required for: ${clear.limits.evidenceRequired.join(', ')}

ETHICS (NON-NEGOTIABLE):
- Flag any claim you're not 100% certain about
- Use inclusive language
- Avoid stereotypes or exclusionary phrasing
- Respect privacy and competitor boundaries

ACCEPTANCE CRITERIA:
${clear.acceptanceCriteria.map(c => `- ${c}`).join('\n')}

REVIEW PATH:
${clear.reviewPath.evidenceLabels.map(l => `- ${l}`).join('\n')}

EXAMPLES OF WHAT TO AVOID:
❌ "80% of filmmakers struggle with..." (unless this stat is in the scraped data)
❌ "The #1 collaboration tool" (unverifiable superlative)
❌ "Guaranteed to improve workflow" (wild promise)
❌ "Everyone agrees that..." (absolute claim)

EXAMPLES OF WHAT TO DO:
✅ "Based on scraped discussions, many creators mention..."
✅ "Common pain points include..." (then list from actual posts)
✅ "Several creators report that..." (qualified claim)
✅ "Trending topics in the community include..."

CRITICAL: If you're not certain about a claim, either:
1. Qualify it: "appears to," "may indicate," "suggests"
2. Source it: [Source: Reddit post by @user]
3. Flag it: [Needs verification]

Never invent data to fill gaps. It's better to say "insufficient data" than to fabricate.
===========================================
`;
}


export function validateAgainstClear(
  analysisResult: any,
  clear: ClearPrompt
): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  const percentageRegex = /\d+%/g;
  const stringified = JSON.stringify(analysisResult);
  const percentages = stringified.match(percentageRegex) || [];
  
  if (percentages.length > 5) {
    warnings.push(`Found ${percentages.length} percentage claims - verify these are from scraped content`);
  }

  const superlatives = ['best', 'leading', 'top', '#1', 'number one', 'greatest', 'most popular'];
  const lowerContent = stringified.toLowerCase();
  
  superlatives.forEach(word => {
    if (lowerContent.includes(word)) {
      warnings.push(`Contains superlative "${word}" - ensure it's evidenced`);
    }
  });

  const absolutes = ['always', 'never', 'everyone', 'nobody', 'guaranteed', 'certain'];
  absolutes.forEach(word => {
    if (lowerContent.includes(word)) {
      warnings.push(`Contains absolute claim "${word}" - consider qualifying`);
    }
  });

  const promises = ['will increase', 'will improve', 'will boost', 'ensures', 'guarantees'];
  promises.forEach(phrase => {
    if (lowerContent.includes(phrase)) {
      errors.push(`Contains unqualified promise "${phrase}" - must qualify or remove`);
    }
  });

  if (analysisResult.content_performance_insights?.length < 3) {
    errors.push('Insufficient content insights (minimum 3 required)');
  }

  if (analysisResult.engagement_targets?.length < 10) {
    warnings.push(`Only ${analysisResult.engagement_targets?.length || 0} engagement targets (15+ recommended)`);
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}