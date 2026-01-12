import { ClipboardCheck, AlertTriangle, CheckCircle2, Zap} from "lucide-react";

interface StrategicRecommendationsProps {
  recommendations: {
    strategic_recommendations: string[];
    risks_or_warnings: string[];
    action_items: string[];
  };
  isEnriched?: boolean; 
}

export function StrategicRecommendations({ recommendations, isEnriched }: StrategicRecommendationsProps) {
  const { strategic_recommendations, risks_or_warnings, action_items } = recommendations;

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border"></div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-foreground">Strategic Recommendations</h2>
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
        
        {/* MAIN STRATEGY CARD */}
        <div className="lg:col-span-2 bg-surface border border-primary/20 rounded-xl p-6 hover:border-primary/40 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <ClipboardCheck className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Top Strategies</h3>
          </div>

          <div className="space-y-5">
            {strategic_recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="min-w-[40px] h-10 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary font-semibold">
                  {i + 1}
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm">{rec}</p>
              </div>
            ))}
          </div>
          
          {isEnriched && (
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-blue-600 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                These recommendations are informed by current market trends and verified data from Perplexity
              </p>
            </div>
          )}
        </div>

        {/* RISKS / WARNINGS */}
        <div className="space-y-6">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-green-600" />
              <h4 className="font-bold text-green-600 text-sm uppercase tracking-wide">
                Considerations
              </h4>
            </div>
            <ul className="space-y-3">
              {risks_or_warnings.map((risk, idx) => (
                <li
                  key={idx}
                  className="flex gap-3 text-sm text-green-700 leading-relaxed"
                >
                  <span className="mt-1 text-green-600 font-bold">•</span>
                  {risk}
                </li>
              ))}
            </ul>
          </div>

          {/* ACTION ITEMS CHECKLIST */}
          <div className="bg-muted/20 border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <h4 className="font-bold text-foreground text-sm uppercase tracking-wide">
                Action Items
              </h4>
            </div>
            <ul className="space-y-3">
              {action_items.map((item, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-muted-foreground leading-relaxed items-start group/item">
                  <span className="mt-0.5 text-success font-bold group-hover/item:scale-110 transition-transform">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}