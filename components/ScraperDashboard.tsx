

"use client";
import { useState, useEffect, useMemo } from "react";
import { Loader, AlertCircle, CheckCircle, Play, ChevronDown, ChevronUp } from "lucide-react";

import { ContentPerformanceInsights } from "./ContentPerformanceInsights";
import { AudienceAnalysis } from "./AudienceAnalysis";
import { StrategicRecommendations } from "./StrategicRecommendations";
import { AutomationOpportunities } from "./AutomationOpportunities";
import { NextSteps } from "./NextSteps";
import { ThemesSection } from "./TopTalkingPoints";
import { EngagementTargets } from "./EngagementTargets";
import { PromptBar } from "./PromptBar";


import { AnalysisApiClient } from "../lib/api";
import { generateSearchQueries } from "../lib/generateQueries";
import { useSavedPrompts } from "../state/useSavedPrompts";
import logo from "../public/assets/image-DNaKSDV2Vm6rz8yKS6WtuJwy4rLZwh.png"
import Image from 'next/image';
import type { AnalysisResult } from "../lib/scrapers/types";
import { EnrichmentStatus } from "./EnrichmentStatus";
import { QualityScoreCard } from "./QualityScoreCard";
import { ExportMenu } from "./ExportsMenu";




export function ScraperDashboard() {
  const { mode, setMode, prompts, savePrompt, deletePrompt } = useSavedPrompts();
  const [prompt, setPrompt] = useState("");
  const [searchQueries, setSearchQueries] = useState<{
    youtube: string[];
    reddit: string[];
    facebook: string[];
  } | null>(null);
  const [queriesExpanded, setQueriesExpanded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qualityScore, setQualityScore] = useState<any>(null);

  useEffect(() => {
    if (success) setTimeout(() => setSuccess(null), 4000);
    if (error) setTimeout(() => setError(null), 5000);
  }, [success, error]);

  const runQueryGeneration = async () => {
    try {
      const queries = await generateSearchQueries(prompt, mode);
      setSearchQueries(queries);
      setQueriesExpanded(true);
      setSuccess("Search queries generated successfully.");
    } catch (err) {
      setError("Failed to generate search queries.");
    }
  };

const handleScrapeAndAnalyze = async () => {
  try {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    const queries = searchQueries ?? await generateSearchQueries(prompt, mode);

    // Pass mode to scrape endpoint
    const scrapeRes = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        queries,
        mode // NEW: Pass mode so Perplexity can use proper context
      }),
    });

    if (!scrapeRes.ok) throw new Error("Scraping failed");

    const { posts, failures, stats, metadata } = await scrapeRes.json();

    // Log scraping metadata
    console.log('📊 Scraping Complete:', {
      total: posts.length,
      perplexityScraped: stats.perplexity?.count || 0,
      verified: metadata?.quality?.verified || 0,
      multiSource: metadata?.quality?.multiSource || 0
    });

    if (failures?.length) {
      setSuccess(`Analysis completed with partial data. Skipped: ${failures.join(", ")}`);
    } else {
      setSuccess(`Analysis complete - ${posts.length} posts collected`);
    }

    const apiClient = new AnalysisApiClient();
    const result = await apiClient.analyzePosts(posts, prompt, mode);

    setAnalysis(result);
    
    console.log(' Analysis received:', {
      hasMetadata: !!result._metadata,
      hasQualityScore: !!result._qualityScore,
      perplexityUsed: result._metadata?.perplexityUsed,
      perplexityScraped: stats.perplexity?.count,
      qualityScoreValue: result._qualityScore?.overall
    });

    if (result._qualityScore) {
      setQualityScore(result._qualityScore);
    }
  } catch (err: any) {
    setError(err.message ?? "Failed");
  } finally {
    setLoading(false);
  }
};




  const strategicPayload = useMemo(() => {
    if (!analysis?.strategic_recommendations) return null;

    const strategic_recommendations = analysis.strategic_recommendations.map((r) => r.recommendation);
    const risks_or_warnings = analysis.strategic_recommendations
      .map((r) => r.reasoning.trim())
      .filter(Boolean)
      .slice(0, 6);
    const action_items = analysis.strategic_recommendations
      .flatMap((r) =>
        r.expected_outcome
          ?.split(/[.?!]\s+/)
          .map((s) => s.trim())
          .filter(Boolean) ?? []
      )
      .slice(0, 10);

    return { strategic_recommendations, risks_or_warnings, action_items };
  }, [analysis]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <Image src={logo} className="w-10 h-10" alt="Creator Pulse" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Creator Pulse</h1>
            <p className="text-sm text-muted-foreground">
              Cross-platform creator intelligence
            </p>
          </div>
        </header>

        {/* Prompt Bar */}
        <section className="mb-6">
          <PromptBar
            prompt={prompt}
            setPrompt={setPrompt}
            onGenerateQueries={runQueryGeneration}
            mode={mode}
            setMode={setMode}
            prompts={prompts}
            savePrompt={savePrompt}
            deletePrompt={deletePrompt}
          />
        </section>

        {/* Generated Queries Preview - Collapsible */}
        {searchQueries && (
          <section className="mb-6">
            <button
              onClick={() => setQueriesExpanded(!queriesExpanded)}
              className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <span className="text-sm font-medium text-foreground">
                Generated Search Queries
              </span>
              {queriesExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {queriesExpanded && (
              <div className="mt-2 p-4 bg-muted/30 border border-border rounded-lg">
                <pre className="text-xs text-muted-foreground overflow-x-auto">
                  {JSON.stringify(searchQueries, null, 2)}
                </pre>
              </div>
            )}
          </section>
        )}

        {/* Start Analysis Button */}
        <section className="mb-6">
          <button
            onClick={handleScrapeAndAnalyze}
            disabled={loading || !prompt.trim()}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader className="animate-spin w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            {loading ? "Analyzing..." : "Start Analysis"}
          </button>
        </section>

        {/* Status Messages */}
        {(error || success) && (
          <section className="mb-6 space-y-3">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="text-destructive w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{error}</span>
              </div>
            )}
            {success && (
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg flex items-start gap-3">
                <CheckCircle className="text-primary w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{success}</span>
              </div>
            )}
          </section>
        )}

        {/* Analysis Results */}
      {analysis && (
          <section className="space-y-8 pt-6 border-t border-border">

            <EnrichmentStatus metadata={analysis._metadata} />

            {qualityScore && (
              <QualityScoreCard quality={qualityScore} />
            )}
            
            <div className="flex justify-end mb-4">
              <ExportMenu analysis={analysis} quality={qualityScore} />
            </div>

            {analysis.content_performance_insights && (
              <ContentPerformanceInsights 
                insights={analysis.content_performance_insights} 
              />
            )}
            
            {analysis.audience_analysis && (
              <AudienceAnalysis 
                audience_analysis={analysis.audience_analysis}
                isEnriched={analysis._metadata?.perplexityUsed} 
              />
            )}
            
            {strategicPayload && (
              <StrategicRecommendations 
                recommendations={strategicPayload}
                isEnriched={analysis._metadata?.perplexityUsed} 
              />
            )}
            
            {analysis.automation_spots && (
              <AutomationOpportunities automation_spots={analysis.automation_spots} />
            )}
            
            {analysis.next_steps && (
              <NextSteps next_steps={analysis.next_steps} />
            )}
            
            {analysis.top_talking_points && (
              <ThemesSection 
                themes={analysis.top_talking_points}
                isEnriched={analysis._metadata?.perplexityUsed} 
              />
            )}
            
            <EngagementTargets targets={analysis.engagement_targets} />
          </section>
        )}
      </div>
    </div>
  );
}

