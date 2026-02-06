"use client";
import { Zap, Clock, TrendingUp, CheckCircle2 } from "lucide-react";

interface EnrichmentStatusProps {
  metadata?: {
    processingTime: number;
    postsAnalyzed: number;
    perplexityUsed: boolean;
    enrichmentSources: string[];
    generatedAt: string;
    mode: string;
  };
}

export function EnrichmentStatus({ metadata }: EnrichmentStatusProps) {
  if (!metadata) return null;

  return (
    <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-violet-600" />
            <h3 className="text-lg font-bold text-foreground">Analysis Enrichment</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Processing Time</p>
                <p className="text-sm font-semibold text-foreground">
                  {(metadata.processingTime / 1000).toFixed(1)}s
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Posts Analyzed</p>
                <p className="text-sm font-semibold text-foreground">
                  {metadata.postsAnalyzed}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                metadata.perplexityUsed 
                  ? 'bg-violet-500/10 border-violet-500/20' 
                  : 'bg-gray-500/10 border-gray-500/20'
              } border`}>
                <Zap className={`w-4 h-4 ${
                  metadata.perplexityUsed ? 'text-violet-600' : 'text-gray-600'
                }`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Perplexity AI</p>
                <p className="text-sm font-semibold text-foreground">
                  {metadata.perplexityUsed ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Analysis Mode</p>
                <p className="text-sm font-semibold text-foreground uppercase">
                  {metadata.mode}
                </p>
              </div>
            </div>
          </div>

          {metadata.perplexityUsed && metadata.enrichmentSources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-violet-500/20">
              <p className="text-xs text-violet-700 leading-relaxed">
                 This analysis has been enriched with real-time market intelligence from{' '}
                <span className="font-semibold">{metadata.enrichmentSources.join(', ')}</span>,
                providing current trends, verified facts, and contextual insights.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}