"use client";
import { CheckCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface QualityScoreCardProps {
  quality: {
    overall: number;
    breakdown: {
      completeness: number;
      evidenceQuality: number;
      actionability: number;
      brandAlignment: number;
      ethicalCompliance: number;
    };
    flags: Array<{
      severity: 'error' | 'warning' | 'info';
      category: string;
      message: string;
      location?: string;
    }>;
    recommendations: string[];
  };
}

export function QualityScoreCard({ quality }: QualityScoreCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-500/10 border-green-500/20';
    if (score >= 70) return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
    if (score >= 50) return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20';
    return 'text-red-600 bg-red-500/10 border-red-500/20';
  };

  const getGrade = (score: number) => {
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

  const errors = quality.flags.filter(f => f.severity === 'error');
  const warnings = quality.flags.filter(f => f.severity === 'warning');
  const infos = quality.flags.filter(f => f.severity === 'info');

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-surface-elevated transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg border ${getScoreColor(quality.overall)}`}>
            <CheckCircle className="w-6 h-6" />
          </div>

          <div className="text-left">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              Quality Score: {quality.overall}/100
              <span className="text-sm font-normal text-muted-foreground">
                (Grade: {getGrade(quality.overall)})
              </span>
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {errors.length > 0 && `${errors.length} errors, `}
              {warnings.length > 0 && `${warnings.length} warnings, `}
              {infos.length} info items
            </p>
          </div>
        </div>

        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-border animate-slide-up">
          <div>
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
              Score Breakdown
            </h4>

            <div className="space-y-2">
              {[
                { label: 'Completeness', score: quality.breakdown.completeness, max: 20 },
                { label: 'Evidence Quality', score: quality.breakdown.evidenceQuality, max: 25 },
                { label: 'Actionability', score: quality.breakdown.actionability, max: 20 },
                { label: 'Brand Alignment', score: quality.breakdown.brandAlignment, max: 20 },
                { label: 'Ethical Compliance', score: quality.breakdown.ethicalCompliance, max: 15 }
              ].map(({ label, score, max }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-36">
                    {label}
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${(score / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-12 text-right">
                    {score}/{max}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {(errors.length > 0 || warnings.length > 0) && (
            <div>
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
                Issues Found
              </h4>

              <div className="space-y-2">
                {errors.map((flag, idx) => (
                  <div
                    key={`error-${idx}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-red-600">
                        {flag.category}
                      </div>
                      <div className="text-sm text-red-700 mt-1">
                        {flag.message}
                      </div>
                      {flag.location && (
                        <div className="text-xs text-red-600/70 mt-1 font-mono">
                          {flag.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {warnings.map((flag, idx) => (
                  <div
                    key={`warning-${idx}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20"
                  >
                    <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-yellow-600">
                        {flag.category}
                      </div>
                      <div className="text-sm text-yellow-700 mt-1">
                        {flag.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {quality.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
                Recommendations
              </h4>

              <div className="space-y-2">
                {quality.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20"
                  >
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      {rec}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}