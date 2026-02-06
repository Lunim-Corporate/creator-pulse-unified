"use client";
import { TrendingUp, ChevronDown, ChevronRight, MessageSquare, Zap } from "lucide-react";
import { useState } from "react";

interface SupportingExample {
  title: string;
  link: string;
}

interface ContentPerformanceInsight {
  topic: string;
  why_it_performed: string;
  supporting_examples: SupportingExample[];
  engagement_pattern: string;
  _enriched?: boolean;
}

interface Props {
  insights: ContentPerformanceInsight[];
}

export function ContentPerformanceInsights({ insights }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border"></div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          Content Performance Insights
        </h2>
        <div className="h-px flex-1 bg-border"></div>
      </div>

      <div className="space-y-4">
        {insights.map((insight, i) => {
          const isOpen = openIndex === i;
          const isEnriched = insight._enriched;

          return (
            <div
              key={i}
              className={`bg-surface rounded-xl border transition-all overflow-hidden ${
                isOpen
                  ? "border-primary/40 shadow-glow"
                  : "border-border hover:border-border/60"
              }`}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-surface-elevated transition-colors"
              >
                <div className="min-w-[40px] h-[40px] flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">
                  #{i + 1}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-foreground">
                      {insight.topic}
                    </h3>
                    {isEnriched && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20">
                        <Zap className="w-3 h-3" />
                        Enhanced
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <TrendingUp className="w-4 h-4 text-success" />
                    <span>{insight.engagement_pattern}</span>
                  </div>
                </div>

                {isOpen ? (
                  <ChevronDown className="w-5 h-5 text-primary transition-transform" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform" />
                )}
              </button>

              {isOpen && (
                <div className="px-6 py-5 space-y-6 bg-muted/20 border-t border-border animate-slide-up">
                  {isEnriched && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
                      <Zap className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-violet-700 leading-relaxed">
                        This insight has been enriched with current market intelligence from Perplexity, 
                        providing up-to-date trends and verified information.
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-accent" />
                      Supporting Examples
                    </h4>

                    <div className="flex flex-wrap gap-2">
                      {insight.supporting_examples.map((ex, idx) => (
                        <a
                          key={idx}
                          href={ex.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 text-sm bg-accent/10 border border-accent/20 text-accent rounded-lg hover:bg-accent/20 transition-colors"
                        >
                          {ex.title}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">
                      Why This Worked
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {insight.why_it_performed}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}