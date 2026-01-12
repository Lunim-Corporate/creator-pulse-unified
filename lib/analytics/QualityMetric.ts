
import type { AnalysisResult } from '../services/AnalysisPipeline';
import type { ClearPrompt } from '../clear/normalizeclear';

export interface QualityScore {
  overall: number; 
  breakdown: {
    completeness: number;
    evidenceQuality: number;
    actionability: number;
    brandAlignment: number;
    ethicalCompliance: number;
  };
  flags: QualityFlag[];
  recommendations: string[];
}

export interface QualityFlag {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  location?: string;
}

export class QualityMetrics {
  static scoreAnalysis(
    result: AnalysisResult,
    clear?: ClearPrompt
  ): QualityScore {
    const flags: QualityFlag[] = [];
    
    // 1. Completeness Check (0-20 points)
    const completeness = this.checkCompleteness(result, flags);
    
    // 2. Evidence Quality (0-25 points)
    const evidenceQuality = this.checkEvidenceQuality(result, flags);
    
    // 3. Actionability (0-20 points)
    const actionability = this.checkActionability(result, flags);
    
    // 4. Brand Alignment (0-20 points)
    const brandAlignment = this.checkBrandAlignment(result, clear, flags);
    
    // 5. Ethical Compliance (0-15 points)
    const ethicalCompliance = this.checkEthicalCompliance(result, flags);
    
    const overall = Math.round(
      completeness + evidenceQuality + actionability + brandAlignment + ethicalCompliance
    );

    const recommendations = this.generateRecommendations(flags, overall);

    return {
      overall,
      breakdown: {
        completeness,
        evidenceQuality,
        actionability,
        brandAlignment,
        ethicalCompliance
      },
      flags,
      recommendations
    };
  }

  private static checkCompleteness(result: AnalysisResult, flags: QualityFlag[]): number {
    let score = 0;
    
    const requiredSections = [
      'content_performance_insights',
      'audience_analysis',
      'strategic_recommendations',
      'engagement_targets',
      'top_talking_points'
    ];

    const missingSections = requiredSections.filter(section => 
      !result[section as keyof AnalysisResult] || 
      (Array.isArray(result[section as keyof AnalysisResult]) && 
       (result[section as keyof AnalysisResult] as any[]).length === 0)
    );

    if (missingSections.length === 0) {
      score += 10;
    } else {
      flags.push({
        severity: 'error',
        category: 'completeness',
        message: `Missing or empty sections: ${missingSections.join(', ')}`
      });
    }

    const insights = result.content_performance_insights?.length || 0;
    if (insights >= 5) {
      score += 5;
    } else if (insights >= 3) {
      score += 3;
      flags.push({
        severity: 'warning',
        category: 'completeness',
        message: `Only ${insights} content insights (5+ recommended)`
      });
    } else {
      flags.push({
        severity: 'error',
        category: 'completeness',
        message: `Insufficient content insights: ${insights} (minimum 3)`
      });
    }

    const targets = result.engagement_targets?.length || 0;
    if (targets >= 15) {
      score += 5;
    } else if (targets >= 10) {
      score += 3;
      flags.push({
        severity: 'warning',
        category: 'completeness',
        message: `Only ${targets} engagement targets (15+ recommended)`
      });
    } else {
      flags.push({
        severity: 'error',
        category: 'completeness',
        message: `Insufficient engagement targets: ${targets} (minimum 10)`
      });
    }

    return score;
  }

  private static checkEvidenceQuality(result: AnalysisResult, flags: QualityFlag[]): number {
    let score = 25; // Start with full score, deduct for issues
    
    const content = JSON.stringify(result);

    // Check for unverified statistics
    const percentRegex = /\b(\d+)%/g;
    const percentMatches = content.match(percentRegex) || [];
    
    if (percentMatches.length > 10) {
      score -= 5;
      flags.push({
        severity: 'warning',
        category: 'evidence',
        message: `High number of percentage claims (${percentMatches.length}) - verify all are sourced`
      });
    }

    // Check for unsupported superlatives
    const superlatives = [
      /\b(best|greatest|leading|top|#1|number one)\b/gi,
      /\b(guaranteed|certain|definitely|absolutely)\b/gi,
      /\b(always|never|everyone|nobody|all|none)\b/gi
    ];

    superlatives.forEach((pattern, idx) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 3) {
        score -= 3;
        flags.push({
          severity: 'warning',
          category: 'evidence',
          message: `Multiple unsupported superlatives or absolutes detected (${matches.length})`
        });
      }
    });

    const insights = result.content_performance_insights || [];
    let insightsWithEvidence = 0;
    
    insights.forEach((insight, idx) => {
      if (insight.supporting_examples && insight.supporting_examples.length >= 3) {
        insightsWithEvidence++;
      } else {
        flags.push({
          severity: 'info',
          category: 'evidence',
          message: `Insight #${idx + 1} has insufficient supporting examples`,
          location: `content_performance_insights[${idx}]`
        });
      }
    });

    if (insights.length > 0 && insightsWithEvidence / insights.length < 0.6) {
      score -= 5;
      flags.push({
        severity: 'warning',
        category: 'evidence',
        message: 'Less than 60% of insights have adequate supporting examples'
      });
    }

    return Math.max(0, score);
  }

  private static checkActionability(result: AnalysisResult, flags: QualityFlag[]): number {
    let score = 0;

    const recommendations = result.strategic_recommendations || [];
    let specificRecommendations = 0;

    recommendations.forEach((rec, idx) => {
      const hasSpecifics = (
        rec.recommendation.length > 50 && // Not too vague
        rec.reasoning.length > 50 &&
        rec.expected_outcome.length > 30
      );

      if (hasSpecifics) {
        specificRecommendations++;
      } else {
        flags.push({
          severity: 'info',
          category: 'actionability',
          message: `Recommendation #${idx + 1} could be more specific`,
          location: `strategic_recommendations[${idx}]`
        });
      }
    });

    if (recommendations.length > 0) {
      score += Math.min(10, (specificRecommendations / recommendations.length) * 10);
    }

    const nextSteps = result.next_steps || [];
    const wellDefinedSteps = nextSteps.filter(step => 
      step.priority && 
      step.expected_impact && 
      step.expected_impact.length > 20
    ).length;

    if (nextSteps.length > 0) {
      score += Math.min(10, (wellDefinedSteps / nextSteps.length) * 10);
    }

    return Math.round(score);
  }

  private static checkBrandAlignment(
    result: AnalysisResult,
    clear: ClearPrompt | undefined,
    flags: QualityFlag[]
  ): number {
    if (!clear) return 15; // Can't check without CLEAR context

    let score = 20;
    const content = JSON.stringify(result).toLowerCase();

    const forbiddenFound = clear.limits.forbiddenClaims.filter(claim =>
      content.includes(claim.toLowerCase())
    );

    if (forbiddenFound.length > 0) {
      score -= 10;
      flags.push({
        severity: 'error',
        category: 'brand-alignment',
        message: `Contains forbidden claims: ${forbiddenFound.join(', ')}`
      });
    }

    // Check voice alignment (basic check)
    const voiceKeywords = clear.context.voice.toLowerCase().split(',').map(v => v.trim());
    // This is a simplified check - in production, you'd use more sophisticated NLP
    
    return Math.max(0, score);
  }

  private static checkEthicalCompliance(result: AnalysisResult, flags: QualityFlag[]): number {
    let score = 15;
    const content = JSON.stringify(result).toLowerCase();

    // Check for potentially exclusionary language
    const problematicTerms = [
      'guys', 'man-hours', 'master/slave', 'blacklist', 'whitelist',
      'crazy', 'insane', 'lame', 'dumb', 'stupid'
    ];

    problematicTerms.forEach(term => {
      if (content.includes(term)) {
        score -= 2;
        flags.push({
          severity: 'warning',
          category: 'ethics',
          message: `Contains potentially non-inclusive term: "${term}"`
        });
      }
    });

    // Check for privacy concerns
    if (content.includes('email') || content.includes('phone')) {
      flags.push({
        severity: 'info',
        category: 'ethics',
        message: 'Contains potential PII - verify no personal information is exposed'
      });
    }

    return Math.max(0, score);
  }

  private static generateRecommendations(flags: QualityFlag[], overall: number): string[] {
    const recommendations: string[] = [];

    // Priority recommendations based on errors
    const errors = flags.filter(f => f.severity === 'error');
    if (errors.length > 0) {
      recommendations.push('• Critical: Address all errors before using this analysis');
      errors.forEach(e => {
        recommendations.push(`  • ${e.message}`);
      });
    }

    // Quality-based recommendations
    if (overall < 50) {
      recommendations.push(' • Quality score is low - consider re-running analysis with refined prompt');
    } else if (overall < 70) {
      recommendations.push(' • Quality is moderate - review warnings before proceeding');
    } else if (overall >= 85) {
      recommendations.push(' • Excellent quality - analysis is ready for use');
    }

    // Specific improvement suggestions
    const evidenceWarnings = flags.filter(f => f.category === 'evidence');
    if (evidenceWarnings.length > 0) {
      recommendations.push(' • Add more supporting examples and verify all statistics');
    }

    const actionabilityIssues = flags.filter(f => f.category === 'actionability');
    if (actionabilityIssues.length > 0) {
      recommendations.push(' • Make recommendations more specific and actionable');
    }

    const ethicsWarnings = flags.filter(f => f.category === 'ethics');
    if (ethicsWarnings.length > 0) {
      recommendations.push(' • Review content for inclusive language and privacy concerns');
    }

    return recommendations;
  }

  
  static generateReportCard(score: QualityScore): string {
    const getGrade = (score: number): string => {
      if (score >= 90) return 'A+';
      if (score >= 85) return 'A';
      if (score >= 80) return 'A-';
      if (score >= 75) return 'B+';
      if (score >= 70) return 'B';
      if (score >= 65) return 'B-';
      if (score >= 60) return 'C+';
      if (score >= 55) return 'C';
      if (score >= 50) return 'C-';
      return 'D';
    };

    const grade = getGrade(score.overall);
    const errorCount = score.flags.filter(f => f.severity === 'error').length;
    const warningCount = score.flags.filter(f => f.severity === 'warning').length;

    return `
╔════════════════════════════════════════════════════════════╗
║            ANALYSIS QUALITY REPORT CARD                    ║
╠════════════════════════════════════════════════════════════╣
║  Overall Score: ${score.overall}/100 [${grade}]                              ║
║                                                            ║
║  Breakdown:                                                ║
║    • Completeness:       ${score.breakdown.completeness}/20                           ║
║    • Evidence Quality:   ${score.breakdown.evidenceQuality}/25                           ║
║    • Actionability:      ${score.breakdown.actionability}/20                           ║
║    • Brand Alignment:    ${score.breakdown.brandAlignment}/20                           ║
║    • Ethical Compliance: ${score.breakdown.ethicalCompliance}/15                           ║
║                                                            ║
║  Issues Found:                                             ║
║     Errors:   ${errorCount}                                          ║
║     Warnings: ${warningCount}                                          ║
║                                                            ║
║  Recommendations:                                          ║
${score.recommendations.map(r => `║    ${r.padEnd(55)} ║`).join('\n')}
╚════════════════════════════════════════════════════════════╝
`;
  }
}