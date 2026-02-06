

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Loader,
  AlertCircle,
  CheckCircle,
  Play,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  TrendingUp,
  Users,
  Target,
  Zap,
  MessageSquare,
  CheckSquare,
  ArrowUp,
  Lightbulb
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";

import { ContentPerformanceInsights } from "./ContentPerformanceInsights";
import { AudienceAnalysis } from "./AudienceAnalysis";
import { StrategicRecommendations } from "./StrategicRecommendations";
import { AutomationOpportunities } from "./AutomationOpportunities";
import { NextSteps } from "./NextSteps";
import { ThemesSection } from "./TopTalkingPoints";
import { EngagementTargets } from "./EngagementTargets";
import { PromptBar } from "./PromptBar";
import { QualityScoreCard } from "./QualityScoreCard";
import { ExportMenu } from "./ExportsMenu";

import { AnalysisApiClient } from "../lib/api";
import { generateSearchQueries } from "../lib/generateQueries";
import { useSavedPrompts } from "../state/useSavedPrompts";
import type { AnalysisResult } from "../lib/scrapers/types";

import logo from "../public/assets/image-DNaKSDV2Vm6rz8yKS6WtuJwy4rLZwh.png";

type SearchQueries = {
  youtube: string[];
  reddit: string[];
  facebook: string[];
};

const sections: {
  id: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "performance", label: "Performance", icon: TrendingUp },
  { id: "audience", label: "Audience", icon: Users },
  { id: "strategy", label: "Strategy", icon: Zap },
  { id: "themes", label: "Themes", icon: MessageSquare },
  { id: "automation", label: "Automation", icon: Lightbulb },
  { id: "targets", label: "Targets", icon: Target },
  { id: "next-steps", label: "Next Steps", icon: CheckSquare }
];

export function ScraperDashboard() {
  const { mode, setMode, prompts, savePrompt, deletePrompt } = useSavedPrompts();

  const [prompt, setPrompt] = useState<string>("");
  const [searchQueries, setSearchQueries] = useState<SearchQueries | null>(null);
  const [queriesExpanded, setQueriesExpanded] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);

  const [activeSection, setActiveSection] = useState<string>("overview");
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  type QualityScore = NonNullable<AnalysisResult["_qualityScore"]>;

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (success) setTimeout(() => setSuccess(null), 4000);
    if (error) setTimeout(() => setError(null), 5000);
  }, [success, error]);

  useEffect(() => {
    const handleScroll = (): void => {
      setShowScrollTop(window.scrollY > 500);

      if (!analysis) return;

      const scrollPosition = window.scrollY + 150;

      for (const section of sections) {
        const element = sectionRefs.current[section.id];
        if (!element) continue;

        const { offsetTop, offsetHeight } = element;
        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [analysis]);

  const scrollToSection = (id: string): void => {
    const element = sectionRefs.current[id];
    if (!element) return;

    const offset = 100;
    window.scrollTo({
      top: element.offsetTop - offset,
      behavior: "smooth"
    });
  };

  const scrollToTop = (): void => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const runQueryGeneration = async (): Promise<void> => {
    try {
      const queries = await generateSearchQueries(prompt, mode);
      setSearchQueries(queries);
      setQueriesExpanded(true);
      setSuccess("Search queries generated successfully.");
    } catch {
      setError("Failed to generate search queries.");
    }
  };

  const handleScrapeAndAnalyze = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setAnalysis(null);

      const queries = searchQueries ?? await generateSearchQueries(prompt, mode);

      const scrapeRes = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries, mode })
      });

      if (!scrapeRes.ok) throw new Error("Scraping failed");

      const { posts, failures, stats, metadata } = await scrapeRes.json();

      if (failures?.length) {
        setSuccess(`Analysis completed with partial data. Skipped: ${failures.join(", ")}`);
      } else {
        setSuccess(`Analysis complete - ${posts.length} posts collected`);
      }

      const apiClient = new AnalysisApiClient();
      const result = await apiClient.analyzePosts(posts, prompt, mode);

      setAnalysis(result);

      if (result._qualityScore) {
        setQualityScore(result._qualityScore);
      }

      setTimeout(() => scrollToSection("overview"), 500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const strategicPayload = useMemo(() => {
    if (!analysis?.strategic_recommendations) return null;

    const strategic_recommendations = analysis.strategic_recommendations.map(
      r => r.recommendation
    );

    const risks_or_warnings = analysis.strategic_recommendations
      .map(r => r.reasoning.trim())
      .filter(Boolean)
      .slice(0, 6);

    const action_items = analysis.strategic_recommendations
      .flatMap(r =>
        r.expected_outcome
          ?.split(/[.?!]\s+/)
          .map(s => s.trim())
          .filter(Boolean) ?? []
      )
      .slice(0, 10);

    return { strategic_recommendations, risks_or_warnings, action_items };
  }, [analysis]);

  return (
    <div className="min-h-screen bg-background">
      
      {/* Sticky Navigation - Only shows when analysis is complete */}
      {analysis && (
        <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-lg border-b border-border shadow-glow">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src={logo} className="w-8 h-8" alt="Creator Pulse" />
                <span className="text-xl font-bold text-foreground">Creator Pulse</span>
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-semibold uppercase border border-primary/20">
                  {mode}
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'text-muted-foreground hover:bg-surface-elevated'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden md:inline">{section.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Header - Only show when no analysis */}
        {!analysis && (
          <header className="flex items-center gap-4 mb-8">
            <Image src={logo} className="w-10 h-10" alt="Creator Pulse" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Creator Pulse</h1>
              <p className="text-sm text-muted-foreground">
                Cross-platform creator intelligence
              </p>
            </div>
          </header>
        )}

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

        {/* Generated Queries Preview */}

        {/* {searchQueries && (
          <section className="mb-6">
            <button
              onClick={() => setQueriesExpanded(!queriesExpanded)}
              className="w-full flex items-center justify-between p-4 bg-surface border border-border rounded-lg hover:bg-surface-elevated transition-colors"
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
              <div className="mt-2 p-4 bg-muted border border-border rounded-lg">
                <pre className="text-xs text-muted-foreground overflow-x-auto">
                  {JSON.stringify(searchQueries, null, 2)}
                </pre>
              </div>
            )}
          </section>
        )} */}

        {/* Start Analysis Button */}
        <section className="mb-6">
          <button
            onClick={handleScrapeAndAnalyze}
            disabled={loading || !prompt.trim()}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
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
                <span className="text-sm text-destructive-foreground">{error}</span>
              </div>
            )}
            {success && (
              <div className="p-4 bg-success/10 border border-success/30 rounded-lg flex items-start gap-3">
                <CheckCircle className="text-success w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-success-foreground">{success}</span>
              </div>
            )}
          </section>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-8">
            
            {/* Overview Section */}
            <section
              ref={(el) => {
                sectionRefs.current["overview"] = el;
              }}
              id="overview"
              className="scroll-mt-24"
            >
              <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-8 text-primary-foreground shadow-glow-strong mb-8">
                <h1 className="text-3xl font-bold mb-2">Analysis Complete</h1>
                <p className="text-primary-foreground/80 text-lg mb-6">
                  {analysis._metadata?.postsAnalyzed || 0} posts analyzed • Quality Score: {qualityScore?.overall || 0}/100
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10">
                    <div className="text-primary-foreground/70 text-xs font-semibold uppercase">Processing Time</div>
                    <div className="text-2xl font-bold mt-1">
                      {((analysis._metadata?.processingTime || 0) / 1000).toFixed(1)}s
                    </div>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10">
                    <div className="text-primary-foreground/70 text-xs font-semibold uppercase">Perplexity Enhanced</div>
                    <div className="text-2xl font-bold mt-1">
                      {analysis._metadata?.perplexityUsed ? '✓ Yes' : '✗ No'}
                    </div>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10">
                    <div className="text-primary-foreground/70 text-xs font-semibold uppercase">Mode</div>
                    <div className="text-2xl font-bold mt-1 uppercase">
                      {analysis._metadata?.mode || mode}
                    </div>
                  </div>
                </div>
              </div>

              {qualityScore && <QualityScoreCard quality={qualityScore} />}
              
              <div className="flex justify-end mt-4">
                <ExportMenu analysis={analysis} quality={qualityScore} />
              </div>
            </section>

            {/* Performance Section */}
            {analysis.content_performance_insights && (
              <section
                ref={(el) => {
                  sectionRefs.current["performance"] = el;
                }}
                id="performance"
                className="scroll-mt-24"
              >
                <ContentPerformanceInsights insights={analysis.content_performance_insights} />
              </section>
            )}

            {/* Audience Section */}
            {analysis.audience_analysis && (
              <section
                ref={(el) => {
                  sectionRefs.current["audience"] = el;
                }}
                id="audience"
                className="scroll-mt-24"
              >
                <AudienceAnalysis 
                  audience_analysis={analysis.audience_analysis}
                  isEnriched={analysis._metadata?.perplexityUsed} 
                />
              </section>
            )}

            {/* Strategy Section */}
            {strategicPayload && (
              <section
                ref={(el) => {
                  sectionRefs.current["strategy"] = el;
                }}
                id="strategy"
                className="scroll-mt-24"
              >
                <StrategicRecommendations 
                  recommendations={strategicPayload}
                  isEnriched={analysis._metadata?.perplexityUsed} 
                />
              </section>
            )}

            {/* Themes Section */}
            {analysis.top_talking_points && (
              <section
                ref={(el) => {
                  sectionRefs.current["themes"] = el;
                }}
                id="themes"
                className="scroll-mt-24"
              >
                <ThemesSection 
                  themes={analysis.top_talking_points}
                  isEnriched={analysis._metadata?.perplexityUsed} 
                />
              </section>
            )}

            {/* Automation Section */}
            {analysis.automation_spots && (
              <section
                ref={(el) => {
                  sectionRefs.current["automation"] = el;
                }}
                id="automation"
                className="scroll-mt-24"
              >
                <AutomationOpportunities automation_spots={analysis.automation_spots} />
              </section>
            )}

            {/* Targets Section */}
            <section
              ref={(el) => {
                sectionRefs.current["targets"] = el;
              }}
              id="targets"
              className="scroll-mt-24"
            >
              <EngagementTargets targets={analysis.engagement_targets} />
            </section>

            {/* Next Steps Section */}
            {analysis.next_steps && (
              <section
                ref={(el) => {
                  sectionRefs.current["next-steps"] = el;
                }}
                id="next-steps"
                className="scroll-mt-24 pb-16"
              >
                <NextSteps next_steps={analysis.next_steps} />
              </section>
            )}
          </div>
        )}
      </main>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-glow hover:shadow-glow-strong transition-all flex items-center justify-center z-40 hover:scale-110"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}