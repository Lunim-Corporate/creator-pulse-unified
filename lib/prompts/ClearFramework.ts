import OpenAI from 'openai';
import { API_CONFIG } from '../config/api.config';

export interface ClearPrompt {
  context: {
    companyProfile: CompanyProfile;
    researchObjective: ResearchObjective;
    audienceProfile: AudienceProfile;
    platformStrategy: PlatformStrategy;
  };
  
  limits: {
    dataQuality: DataQualityRules;
    ethicalBoundaries: EthicalBoundaries;
    forbiddenClaims: string[];
  };
  
  evidence: {
    requiredSources: number;
    citationRequired: boolean;
    verificationLevel: 'high' | 'medium' | 'low';
  };
  
  acceptanceCriteria: {
    minimumInsights: number;
    minimumEngagementTargets: number;
    qualityThreshold: number;
  };
  
  review: {
    selfCheckQuestions: string[];
    validationSteps: string[];
    outputFormat: OutputFormat;
  };
}

interface CompanyProfile {
  name: string;
  mode: 'tabb' | 'lunim' | 'general'; 
  mission: string;
  targetMarket: string[];
  brandVoice: {
    tone: string[];
    avoidTerms: string[];
    preferredFraming: string[];
  };
  competitivePosition: string;
}

interface ResearchObjective {
  primary: string;
  secondary: string[];
  successMetrics: string[];
  timeframe?: string;
  expectedOutcomes: string[];
}

interface AudienceProfile {
  primarySegments: string[];
  secondarySegments: string[];
  painPoints: string[];
  motivations: string[];
  behaviors: string[];
}

interface PlatformStrategy {
  primary: string[];
  contentTypes: Record<string, string[]>;
  engagementApproach: Record<string, string>;
}

interface DataQualityRules {
  minSourceAge: string;
  preferredSources: string[];
  excludedSources: string[];
  verificationRequired: boolean;
}

interface EthicalBoundaries {
  inclusiveLanguage: boolean;
  privacyRespecting: boolean;
  competitorRespect: boolean;
  transparencyCommitment: boolean;
  noDarkPatterns: boolean;
}

interface OutputFormat {
  structure: string[];
  detailLevel: 'executive' | 'detailed' | 'comprehensive';
  actionableInsights: boolean;
}

export class ClearFrameworkEnhancer {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: API_CONFIG.openai.apiKey });
  }

  async enhancePrompt(rawPrompt: string, mode: 'tabb' | 'lunim' | 'general'): Promise<ClearPrompt> { 
    const companyContext = this.getCompanyContext(mode);
    const systemPrompt = this.buildEnhancementPrompt(companyContext);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: this.formatUserMessage(rawPrompt, companyContext) }
        ]
      });

      const enhanced = JSON.parse(completion.choices[0].message.content || '{}');
      return this.validateAndEnrich(enhanced, mode);
    } catch (error) {
      console.error('CLEAR enhancement failed, using defaults:', error);
      return this.getDefaultClear(rawPrompt, mode);
    }
  }

  private getCompanyContext(mode: 'tabb' | 'lunim' | 'general'): CompanyProfile { 
    const profiles: Record<string, CompanyProfile> = {
      tabb: {
        name: 'Tabb',
        mode: 'tabb',
        mission: 'Empower filmmakers and creative teams through project-centered collaboration',
        targetMarket: [
          'Independent filmmakers',
          'Content creators',
          'Film students',
          'Production companies',
          'Video editors',
          'Creative teams'
        ],
        brandVoice: {
          tone: ['practical', 'community-driven', 'supportive', 'professional', 'empowering'],
          avoidTerms: ['disruptive', 'revolutionary', 'game-changing', 'unicorn', 'crushing it'],
          preferredFraming: [
            'Collaboration over competition',
            'Practical solutions for real problems',
            'Community-first approach',
            'Creator empowerment',
            'Workflow efficiency',
            'Team coordination'
          ]
        },
        competitivePosition: 'Project-centered network for filmmakers (vs. general social networks)'
      },
      lunim: {
        name: 'Lunim Studio',
        mode: 'lunim',
        mission: 'Pioneer creative technology through innovation, design thinking, and strategic AI integration',
        targetMarket: [
          'Innovation leaders',
          'Design teams',
          'Forward-thinking brands',
          'Technology adopters',
          'Creative technologists',
          'Strategic decision-makers'
        ],
        brandVoice: {
          tone: ['visionary', 'strategic', 'thoughtful', 'experimental', 'rigorous'],
          avoidTerms: ['hype', 'buzzword-heavy', 'overpromise', 'magical', 'revolutionary'],
          preferredFraming: [
            'Innovation through experimentation',
            'Systems thinking',
            'Long-term strategic value',
            'Thoughtful integration',
            'Design-first approach',
            'Measured innovation'
          ]
        },
        competitivePosition: 'Strategic innovation partner (vs. execution-only agencies)'
      },
      general: { 
        name: 'Creator Pulse',
        mode: 'general',
        mission: 'Provide comprehensive creator insights across platforms and industries',
        targetMarket: [
          'Content creators',
          'Digital professionals',
          'Social media managers',
          'Marketing teams',
          'Influencers',
          'Multi-platform creators'
        ],
        brandVoice: {
          tone: ['neutral', 'data-driven', 'adaptable', 'professional', 'informative'],
          avoidTerms: ['biased', 'promotional', 'platform-exclusive', 'narrow-focused'],
          preferredFraming: [
            'Cross-platform insights',
            'Data-driven recommendations',
            'Universal creator principles',
            'Broad audience understanding',
            'Platform-agnostic strategies',
            'Inclusive creator community'
          ]
        },
        competitivePosition: 'Universal creator intelligence platform (vs. platform-specific tools)'
      }
    };

    return profiles[mode];
  }

  private buildEnhancementPrompt(company: CompanyProfile): string {
    return `You are a research strategy expert for ${company.name}.

COMPANY CONTEXT:
Mission: ${company.mission}
Target Market: ${company.targetMarket.join(', ')}
Competitive Position: ${company.competitivePosition}

BRAND VOICE:
Tone: ${company.brandVoice.tone.join(', ')}
Avoid: ${company.brandVoice.avoidTerms.join(', ')}
Framing: ${company.brandVoice.preferredFraming.join('; ')}

Your task is to transform a raw research prompt into a structured C.L.E.A.R. framework:

**C**ontext: Deep understanding of business objectives, audience needs, and market position
**L**imits: Clear boundaries on data quality, ethics, and forbidden claims
**E**vidence: Requirements for sources, citations, and verification
**A**cceptance: Measurable criteria for research success
**R**eview: Validation steps and output format

Return a JSON object with this structure:
{
  "context": {
    "companyProfile": { ... },
    "researchObjective": {
      "primary": "main research goal",
      "secondary": ["supporting goals"],
      "successMetrics": ["how to measure success"],
      "expectedOutcomes": ["what we hope to learn"]
    },
    "audienceProfile": {
      "primarySegments": ["key audience groups"],
      "secondarySegments": ["secondary groups"],
      "painPoints": ["problems they face"],
      "motivations": ["what drives them"],
      "behaviors": ["how they act"]
    },
    "platformStrategy": {
      "primary": ["key platforms"],
      "contentTypes": { "youtube": ["tutorials", "vlogs"], ... },
      "engagementApproach": { "youtube": "comment on tutorials", ... }
    }
  },
  "limits": {
    "dataQuality": {
      "minSourceAge": "6 months",
      "preferredSources": ["industry reports", "creator interviews"],
      "excludedSources": ["speculation", "unverified claims"],
      "verificationRequired": true
    },
    "ethicalBoundaries": {
      "inclusiveLanguage": true,
      "privacyRespecting": true,
      "competitorRespect": true,
      "transparencyCommitment": true,
      "noDarkPatterns": true
    },
    "forbiddenClaims": ["list of claims not to make"]
  },
  "evidence": {
    "requiredSources": 3,
    "citationRequired": true,
    "verificationLevel": "high"
  },
  "acceptanceCriteria": {
    "minimumInsights": 5,
    "minimumEngagementTargets": 15,
    "qualityThreshold": 0.7
  },
  "review": {
    "selfCheckQuestions": ["questions to validate quality"],
    "validationSteps": ["steps to verify accuracy"],
    "outputFormat": {
      "structure": ["sections to include"],
      "detailLevel": "detailed",
      "actionableInsights": true
    }
  }
}`;
  }

  private formatUserMessage(rawPrompt: string, company: CompanyProfile): string {
    return `Raw Research Request: "${rawPrompt}"

Company: ${company.name}
Mode: ${company.mode}

Create a comprehensive C.L.E.A.R. framework that:
1. Aligns with ${company.name}'s mission and brand voice
2. Targets the right audience segments
3. Uses appropriate platforms and engagement strategies
4. Sets clear quality standards
5. Defines measurable success criteria

Be specific and actionable.`;
  }

  private validateAndEnrich(prompt: any, mode: 'tabb' | 'lunim' | 'general'): ClearPrompt { 
    const defaults = this.getDefaultClear('', mode);
    
    return {
      context: {
        ...defaults.context,
        ...prompt.context,
        companyProfile: this.getCompanyContext(mode)
      },
      limits: {
        ...defaults.limits,
        ...prompt.limits
      },
      evidence: {
        ...defaults.evidence,
        ...prompt.evidence
      },
      acceptanceCriteria: {
        ...defaults.acceptanceCriteria,
        ...prompt.acceptanceCriteria
      },
      review: {
        ...defaults.review,
        ...prompt.review
      }
    };
  }

  private getDefaultClear(rawPrompt: string, mode: 'tabb' | 'lunim' | 'general'): ClearPrompt {
    const company = this.getCompanyContext(mode);
    
    const defaults: Record<string, Partial<ClearPrompt>> = {
      tabb: {
        context: {
          companyProfile: company,
          researchObjective: {
            primary: rawPrompt || 'Understand filmmaker collaboration challenges',
            secondary: ['Identify tool gaps', 'Find engagement opportunities'],
            successMetrics: ['Quality of insights', 'Actionable recommendations', 'Engagement target relevance'],
            expectedOutcomes: ['Clear pain points', 'Tool preferences', 'Workflow patterns']
          },
          audienceProfile: {
            primarySegments: ['Independent filmmakers', 'Content creators'],
            secondarySegments: ['Film students', 'Production coordinators'],
            painPoints: ['Remote collaboration', 'Project management', 'Team coordination'],
            motivations: ['Efficient workflows', 'Better collaboration', 'Professional growth'],
            behaviors: ['Active in communities', 'Tutorial seekers', 'Tool experimenters']
          },
          platformStrategy: {
            primary: ['YouTube', 'Reddit'],
            contentTypes: {
              youtube: ['tutorials', 'gear reviews', 'workflow videos'],
              reddit: ['questions', 'discussions', 'problem-solving']
            },
            engagementApproach: {
              youtube: 'Comment on tutorials and workflow videos',
              reddit: 'Reply to collaboration pain points'
            }
          }
        },
        limits: {
          dataQuality: {
            minSourceAge: '6 months',
            preferredSources: ['creator interviews', 'industry blogs', 'tutorial comments'],
            excludedSources: ['promotional content', 'spam', 'outdated info'],
            verificationRequired: true
          },
          ethicalBoundaries: {
            inclusiveLanguage: true,
            privacyRespecting: true,
            competitorRespect: true,
            transparencyCommitment: true,
            noDarkPatterns: true
          },
          forbiddenClaims: [
            'Claims about competitor inferiority',
            'Unverified statistics',
            'Absolute statements without evidence'
          ]
        },
        evidence: {
          requiredSources: 3,
          citationRequired: true,
          verificationLevel: 'high' as const
        },
        acceptanceCriteria: {
          minimumInsights: 5,
          minimumEngagementTargets: 15,
          qualityThreshold: 0.7
        },
        review: {
          selfCheckQuestions: [
            'Are insights actionable?',
            'Do recommendations align with brand voice?',
            'Are engagement targets qualified?',
            'Is data current?'
          ],
          validationSteps: [
            'Verify all statistics',
            'Check engagement target relevance',
            'Validate tone consistency'
          ],
          outputFormat: {
            structure: ['insights', 'audience', 'strategy', 'engagement', 'next steps'],
            detailLevel: 'detailed' as const,
            actionableInsights: true
          }
        }
      },
      lunim: {
        context: {
          companyProfile: company,
          researchObjective: {
            primary: rawPrompt || 'Understand creative technology adoption patterns',
            secondary: ['Identify innovation opportunities', 'Find strategic partnerships'],
            successMetrics: ['Insight depth', 'Strategic value', 'Innovation potential'],
            expectedOutcomes: ['Technology trends', 'Design thinking applications', 'Integration strategies']
          },
          audienceProfile: {
            primarySegments: ['Innovation leaders', 'Design teams'],
            secondarySegments: ['Technology adopters', 'Strategic planners'],
            painPoints: ['AI integration uncertainty', 'Design system complexity', 'Innovation measurement'],
            motivations: ['Competitive advantage', 'Future-proofing', 'Strategic innovation'],
            behaviors: ['Research-driven', 'Early adopters', 'Systems thinkers']
          },
          platformStrategy: {
            primary: ['YouTube', 'Reddit'],
            contentTypes: {
              youtube: ['tech talks', 'case studies', 'thought leadership'],
              reddit: ['innovation discussions', 'tool comparisons', 'strategic questions']
            },
            engagementApproach: {
              youtube: 'Comment on AI and design innovation content',
              reddit: 'Contribute to strategic technology discussions'
            }
          }
        },
        limits: {
          dataQuality: {
            minSourceAge: '6 months',
            preferredSources: ['tech reports', 'case studies', 'academic research'],
            excludedSources: ['hype articles', 'speculative content', 'unverified claims'],
            verificationRequired: true
          },
          ethicalBoundaries: {
            inclusiveLanguage: true,
            privacyRespecting: true,
            competitorRespect: true,
            transparencyCommitment: true,
            noDarkPatterns: true
          },
          forbiddenClaims: [
            'AI hype without substance',
            'Overpromises about technology',
            'Dismissive attitudes toward traditional methods'
          ]
        },
        evidence: {
          requiredSources: 5,
          citationRequired: true,
          verificationLevel: 'high' as const
        },
        acceptanceCriteria: {
          minimumInsights: 5,
          minimumEngagementTargets: 15,
          qualityThreshold: 0.8
        },
        review: {
          selfCheckQuestions: [
            'Is analysis strategically valuable?',
            'Are recommendations forward-thinking?',
            'Is tone appropriately visionary?',
            'Are insights systems-level?'
          ],
          validationSteps: [
            'Verify technology claims',
            'Check strategic alignment',
            'Validate innovation potential'
          ],
          outputFormat: {
            structure: ['trends', 'strategic insights', 'innovation opportunities', 'recommendations'],
            detailLevel: 'comprehensive' as const,
            actionableInsights: true
          }
        }
      },
      general: { 
        context: {
          companyProfile: company,
          researchObjective: {
            primary: rawPrompt || 'Understand creator trends and audience insights across platforms',
            secondary: ['Identify content opportunities', 'Find engagement patterns', 'Discover growth strategies'],
            successMetrics: ['Insight breadth', 'Cross-platform applicability', 'Actionable recommendations'],
            expectedOutcomes: ['Platform trends', 'Audience behaviors', 'Content strategies', 'Growth opportunities']
          },
          audienceProfile: {
            primarySegments: ['Content creators', 'Digital professionals', 'Social media managers'],
            secondarySegments: ['Influencers', 'Marketing teams', 'Brand managers'],
            painPoints: ['Multi-platform management', 'Audience growth', 'Content consistency', 'Engagement optimization'],
            motivations: ['Audience reach', 'Platform success', 'Content performance', 'Community building'],
            behaviors: ['Multi-platform presence', 'Data-driven decisions', 'Trend awareness', 'Community engagement']
          },
          platformStrategy: {
            primary: ['YouTube', 'Reddit', 'Facebook'],
            contentTypes: {
              youtube: ['vlogs', 'tutorials', 'reviews', 'entertainment'],
              reddit: ['discussions', 'questions', 'community posts'],
              facebook: ['updates', 'community posts', 'live streams']
            },
            engagementApproach: {
              youtube: 'Comment on trending content and community discussions',
              reddit: 'Participate in creator-focused discussions',
              facebook: 'Engage with creator groups and communities'
            }
          }
        },
        limits: {
          dataQuality: {
            minSourceAge: '6 months',
            preferredSources: ['creator posts', 'community discussions', 'platform data'],
            excludedSources: ['promotional spam', 'fake engagement', 'outdated trends'],
            verificationRequired: true
          },
          ethicalBoundaries: {
            inclusiveLanguage: true,
            privacyRespecting: true,
            competitorRespect: true,
            transparencyCommitment: true,
            noDarkPatterns: true
          },
          forbiddenClaims: [
            'Platform-biased recommendations',
            'Unverified growth promises',
            'Exclusionary statements',
            'Unsubstantiated trends'
          ]
        },
        evidence: {
          requiredSources: 3,
          citationRequired: true,
          verificationLevel: 'medium' as const
        },
        acceptanceCriteria: {
          minimumInsights: 5,
          minimumEngagementTargets: 15,
          qualityThreshold: 0.7
        },
        review: {
          selfCheckQuestions: [
            'Are insights applicable across platforms?',
            'Do recommendations avoid platform bias?',
            'Are engagement targets diverse?',
            'Is data current and representative?'
          ],
          validationSteps: [
            'Verify cross-platform relevance',
            'Check for platform bias',
            'Validate audience diversity',
            'Ensure inclusive language'
          ],
          outputFormat: {
            structure: ['trends', 'audience insights', 'platform strategies', 'engagement opportunities', 'recommendations'],
            detailLevel: 'detailed' as const,
            actionableInsights: true
          }
        }
      }
    };

    return defaults[mode] as ClearPrompt;
  }

  
  generatePromptSummary(clear: ClearPrompt): string {
    return `
RESEARCH FRAMEWORK (C.L.E.A.R.)

CONTEXT:
Company: ${clear.context.companyProfile.name}
Objective: ${clear.context.researchObjective.primary}
Primary Audience: ${clear.context.audienceProfile.primarySegments.join(', ')}
Key Pain Points: ${clear.context.audienceProfile.painPoints.slice(0, 3).join(', ')}

QUALITY STANDARDS:
- Minimum ${clear.acceptanceCriteria.minimumInsights} high-quality insights
- At least ${clear.acceptanceCriteria.minimumEngagementTargets} qualified engagement targets
- Evidence from ${clear.evidence.requiredSources}+ sources
- ${clear.evidence.verificationLevel} verification level

ETHICAL BOUNDARIES:
${Object.entries(clear.limits.ethicalBoundaries)
  .filter(([_, value]) => value)
  .map(([key]) => `- ${key.replace(/([A-Z])/g, ' $1').trim()}`)
  .join('\n')}

FORBIDDEN CLAIMS:
${clear.limits.forbiddenClaims.map(c => `- ${c}`).join('\n')}

OUTPUT REQUIREMENTS:
Detail Level: ${clear.review.outputFormat.detailLevel}
Must include: ${clear.review.outputFormat.structure.join(', ')}
Actionable: ${clear.review.outputFormat.actionableInsights ? 'Yes' : 'No'}
`;
  }
}