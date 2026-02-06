import { Smile, Zap, ChevronRight } from "lucide-react";

interface AudienceAnalysisProps {
  audience_analysis: {
    estimated_people_talking: number;
    audience_segments: string[];
    sentiment_summary: string;
    interest_drivers: string[];
  };
  isEnriched?: boolean; 
}

function formatNumberShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function AudienceAnalysis({ audience_analysis, isEnriched }: AudienceAnalysisProps) {
  const {
    estimated_people_talking,
    audience_segments,
    sentiment_summary,
    interest_drivers,
  } = audience_analysis;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border"></div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Audience Analysis
          </h2>
          {isEnriched && (
            <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-full">
              <Zap className="w-3.5 h-3.5" />
              Perplexity Enhanced
            </span>
          )}
        </div>
        <div className="h-px flex-1 bg-border"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 bg-surface border border-border rounded-xl p-6 flex items-center gap-6">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <Zap className="w-7 h-7 text-primary" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-3xl font-extrabold text-foreground leading-none">
                {formatNumberShort(estimated_people_talking)}
              </h3>
              <span className="text-sm text-muted-foreground uppercase font-semibold">
                estimated people talking
              </span>
            </div>

            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
              This is an estimated audience size inferred from scraped conversations,
              engagement volume, and creator follower signals{isEnriched ? ', enhanced with current market data from Perplexity' : ''}. Use this as a directional metric
              for how large the active conversation is right now.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {audience_segments.slice(0, 6).map((seg, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-xs rounded-full bg-secondary/10 border border-secondary/20 text-secondary font-semibold"
                >
                  {seg}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-success/10 border border-success/20">
                <Smile className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  Sentiment
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {sentiment_summary || "Neutral / mixed"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Interest drivers
              </div>
              <div className="text-xs text-muted-foreground">ranked</div>
            </div>

            <ul className="space-y-2">
              {interest_drivers.slice(0, 5).map((d, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-[32px] h-8 flex items-center justify-center rounded-md bg-muted/20 text-sm font-semibold text-foreground">
                      {i + 1}
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed">{d}</div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}