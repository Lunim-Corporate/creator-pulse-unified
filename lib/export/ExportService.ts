
import type { AnalysisResult } from '../services/AnalysisPipeline';
import type { QualityScore } from '../analytics/QualityMetric';

export type ExportFormat = 'json' | 'markdown' | 'csv' | 'notion';

export class ExportService {
  static toJSON(result: AnalysisResult, quality?: QualityScore): string {
    const exportData = {
      ...result,
      _qualityScore: quality,
      _exportedAt: new Date().toISOString(),
      _exportFormat: 'json'
    };

    return JSON.stringify(exportData, null, 2);
  }

  
  static toMarkdown(result: AnalysisResult, quality?: QualityScore): string {
    const mode = result._metadata?.mode || 'Unknown';
    const timestamp = new Date(result._metadata?.generatedAt || Date.now());

    let md = `# Creator Pulse Analysis Report\n\n`;
    md += `**Mode:** ${mode.toUpperCase()}\n`;
    md += `**Generated:** ${timestamp.toLocaleString()}\n`;
    md += `**Posts Analyzed:** ${result._metadata?.postsAnalyzed || 'Unknown'}\n`;
    md += `**Perplexity Enhanced:** ${result._metadata?.perplexityUsed ? 'Yes ✨' : 'No'}\n\n`;

    // Quality Score
    if (quality) {
      md += `## Quality Score: ${quality.overall}/100\n\n`;
      md += `- Completeness: ${quality.breakdown.completeness}/20\n`;
      md += `- Evidence Quality: ${quality.breakdown.evidenceQuality}/25\n`;
      md += `- Actionability: ${quality.breakdown.actionability}/20\n`;
      md += `- Brand Alignment: ${quality.breakdown.brandAlignment}/20\n`;
      md += `- Ethical Compliance: ${quality.breakdown.ethicalCompliance}/15\n\n`;

      if (quality.flags.filter(f => f.severity === 'error').length > 0) {
        md += `###  Issues to Address\n\n`;
        quality.flags
          .filter(f => f.severity === 'error')
          .forEach(flag => {
            md += `- **${flag.category}:** ${flag.message}\n`;
          });
        md += '\n';
      }
    }

    md += `---\n\n`;

    // Content Performance Insights
    md += `##  Content Performance Insights\n\n`;
    result.content_performance_insights?.forEach((insight, idx) => {
      md += `### ${idx + 1}. ${insight.topic}`;
      if ((insight as any)._enriched) {
        md += ` ✨`;
      }
      md += `\n\n`;
      md += `**Why it performed:** ${insight.why_it_performed}\n\n`;
      md += `**Engagement pattern:** ${insight.engagement_pattern}\n\n`;
      
      if (insight.supporting_examples?.length > 0) {
        md += `**Examples:**\n`;
        insight.supporting_examples.forEach((ex: { title: string; link: string }) => {
            md += `- [${ex.title}](${ex.link})\n`;
        });
        md += `\n`;
      }
    });

    md += `---\n\n`;

    // Audience Analysis
    md += `##  Audience Analysis\n\n`;
    md += `**Estimated People Talking:** ${result.audience_analysis.estimated_people_talking.toLocaleString()}\n\n`;
    md += `**Sentiment:** ${result.audience_analysis.sentiment_summary}\n\n`;
    
    md += `**Audience Segments:**\n`;
    result.audience_analysis.audience_segments.forEach((seg: string) => {
        md += `- ${seg}\n`;
    });
    md += `\n`;

    md += `**Interest Drivers:**\n`;
    result.audience_analysis.interest_drivers.forEach((driver: string, idx: number) => {
        md += `${idx + 1}. ${driver}\n`;
    });
    md += `\n`;

    md += `---\n\n`;

    // Strategic Recommendations
    md += `##  Strategic Recommendations\n\n`;
    result.strategic_recommendations?.forEach((rec, idx) => {
      md += `### ${idx + 1}. ${rec.recommendation}\n\n`;
      md += `**Reasoning:** ${rec.reasoning}\n\n`;
      md += `**Expected Outcome:** ${rec.expected_outcome}\n\n`;
    });

    md += `---\n\n`;

    // Next Steps
    md += `##  Next Steps\n\n`;
    const priorityOrder: Record<'high' | 'medium' | 'low', number> = { high: 1, medium: 2, low: 3 };
    const sortedSteps = [...(result.next_steps || [])]
      .sort(
        (a: { priority: 'high' | 'medium' | 'low' }, b: { priority: 'high' | 'medium' | 'low' }) =>
          priorityOrder[a.priority] - priorityOrder[b.priority]
      );

    sortedSteps.forEach((step, idx) => {
      const icon = step.priority === 'high' ? '🔴' : step.priority === 'medium' ? '🟡' : '🟢';
      md += `${idx + 1}. ${icon} **${step.step}** [${step.priority} priority]\n`;
      md += `   - ${step.expected_impact}\n\n`;
    });

    md += `---\n\n`;

    // Top Talking Points
    md += `## 💬 Top Talking Points\n\n`;
    result.top_talking_points?.forEach((point, idx) => {
      md += `### ${idx + 1}. ${point.topic}\n\n`;
      md += `${point.what_people_are_saying}\n\n`;
      md += `**Keywords:** ${point.keywords.join(', ')}\n\n`;
      md += `**Growth Trend:** ${point.growth_trend}\n\n`;
    });

    md += `---\n\n`;

    // Engagement Targets
    md += `## 🎯 Engagement Targets (${result.engagement_targets.length})\n\n`;
    result.engagement_targets?.slice(0, 20).forEach((target, idx) => {
      md += `### ${idx + 1}. @${target.creator_handle} (${target.platform})\n\n`;
      md += `**Relevance Score:** ${target.relevance_score}/100\n`;
      md += `**Creator Tier:** ${target.creator_tier}\n\n`;
      md += `**Summary:** ${target.summary.slice(0, 200)}...\n\n`;
      md += `**Pain Point:** ${target.pain_point_match}\n\n`;
      md += `**Engagement Strategy:** ${target.recommended_engagement}\n\n`;
      
      if (target.example_outreach) {
        md += `**Example Message:**\n> ${target.example_outreach}\n\n`;
      }
      
      md += `[View Post](${target.post_link})\n\n`;
      md += `---\n\n`;
    });

    // Footer
    md += `\n---\n\n`;
    md += `*Generated by Creator Pulse - ${new Date().toLocaleString()}*\n`;

    return md;
  }

 
  static toCSV(result: AnalysisResult): string {
    const headers = [
      'Creator Handle',
      'Platform',
      'Relevance Score',
      'Creator Tier',
      'Pain Point',
      'Engagement Type',
      'Post Link',
      'Summary'
    ];

    let csv = headers.join(',') + '\n';

    result.engagement_targets?.forEach(target => {
      const row = [
        target.creator_handle,
        target.platform,
        target.relevance_score,
        target.creator_tier,
        `"${target.pain_point_match.replace(/"/g, '""')}"`,
        target.recommended_engagement,
        target.post_link,
        `"${target.summary.slice(0, 200).replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Export to Notion-compatible markdown
   */
  static toNotion(result: AnalysisResult): string {
    // Notion uses a simplified markdown format
    let notion = `# Creator Pulse Analysis\n\n`;
    
    // Add a table of contents
    notion += `## Table of Contents\n\n`;
    notion += `- [Content Performance](#content-performance)\n`;
    notion += `- [Audience Analysis](#audience-analysis)\n`;
    notion += `- [Strategic Recommendations](#strategic-recommendations)\n`;
    notion += `- [Engagement Targets](#engagement-targets)\n\n`;

    // Content Performance
    notion += `## Content Performance\n\n`;
    result.content_performance_insights?.forEach((insight, idx) => {
      notion += `**${idx + 1}. ${insight.topic}**\n\n`;
      notion += `${insight.why_it_performed}\n\n`;
    });

    // Audience
    notion += `## Audience Analysis\n\n`;
    notion += `**Estimated Reach:** ${result.audience_analysis.estimated_people_talking.toLocaleString()} people\n\n`;
    notion += `**Key Segments:**\n`;
    result.audience_analysis.audience_segments.forEach((seg: string) => {
        notion += `- ${seg}\n`;
        });
    notion += `\n`;

    // Recommendations as a database
    notion += `## Strategic Recommendations\n\n`;
    notion += `| Recommendation | Reasoning | Expected Outcome |\n`;
    notion += `|----------------|-----------|------------------|\n`;
    result.strategic_recommendations?.forEach(rec => {
      notion += `| ${rec.recommendation} | ${rec.reasoning.slice(0, 100)}... | ${rec.expected_outcome.slice(0, 100)}... |\n`;
    });
    notion += `\n`;

    // Engagement targets database
    notion += `## Engagement Targets\n\n`;
    notion += `| Creator | Platform | Score | Pain Point |\n`;
    notion += `|---------|----------|-------|------------|\n`;
    result.engagement_targets?.slice(0, 30).forEach(target => {
      notion += `| @${target.creator_handle} | ${target.platform} | ${target.relevance_score} | ${target.pain_point_match.slice(0, 50)} |\n`;
    });

    return notion;
  }

  
  static downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
    if (typeof window === 'undefined') return; // Server-side

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  
  static exportAnalysis(
    result: AnalysisResult,
    format: ExportFormat,
    quality?: QualityScore
  ): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const mode = result._metadata?.mode || 'analysis';
    const baseFilename = `creator-pulse-${mode}-${timestamp}`;

    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        content = this.toJSON(result, quality);
        filename = `${baseFilename}.json`;
        mimeType = 'application/json';
        break;

      case 'markdown':
        content = this.toMarkdown(result, quality);
        filename = `${baseFilename}.md`;
        mimeType = 'text/markdown';
        break;

      case 'csv':
        content = this.toCSV(result);
        filename = `${baseFilename}-targets.csv`;
        mimeType = 'text/csv';
        break;

      case 'notion':
        content = this.toNotion(result);
        filename = `${baseFilename}-notion.md`;
        mimeType = 'text/markdown';
        break;

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    this.downloadFile(content, filename, mimeType);
  }
}