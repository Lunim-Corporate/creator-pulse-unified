import { ChevronDown, Hash, Activity, Zap } from "lucide-react";
import { useState } from "react";
import { AnalysisResult } from "../lib/scrapers/types";

interface TopTalkingPointsProps {
  themes: AnalysisResult["top_talking_points"];
  isEnriched?: boolean; 
}

export function ThemesSection({ themes, isEnriched }: TopTalkingPointsProps) {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border"></div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-foreground">Top Talking Points</h2>
          {isEnriched && (
            <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-full">
              <Zap className="w-3.5 h-3.5" />
              Perplexity Enhanced
            </span>
          )}
        </div>
        <div className="h-px flex-1 bg-border"></div>
      </div>

      <div className="space-y-3">
        {themes.map((point, idx) => (
          <div
            key={idx}
            className={`bg-surface rounded-xl border overflow-hidden transition-all duration-300 ${
              expanded === idx
                ? "border-primary/50 shadow-glow"
                : "border-border hover:border-border/60"
            }`}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <button
              onClick={() => setExpanded(expanded === idx ? null : idx)}
              className="w-full px-6 py-5 flex items-center justify-between hover:bg-surface-elevated transition-colors"
            >
              <div className="text-left flex-1">
                <h3 className="font-bold text-foreground text-lg mb-1">
                  {point.topic}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {point.what_people_are_saying}
                </p>
              </div>

              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-all duration-300 ml-4 ${
                  expanded === idx ? "rotate-180 text-primary" : ""
                }`}
              />
            </button>

            {expanded === idx && (
              <div className="px-6 py-6 bg-muted/20 border-t border-border space-y-6 animate-slide-up">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Hash className="w-4 h-4 text-secondary" />
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                      Frequently Mentioned Keywords
                    </h4>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {point.keywords.map((keyword, kidx) => (
                      <span
                        key={kidx}
                        className="px-4 py-2 bg-secondary/10 border border-secondary/30 text-secondary text-sm font-semibold rounded-full hover:bg-secondary/20 transition-colors"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-border/50"></div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                      Growth Trend
                    </h4>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {point.growth_trend}
                  </p>
                </div>
                
                {isEnriched && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-blue-600 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5" />
                      Trend analysis enhanced with current market intelligence from Perplexity
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}