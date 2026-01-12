


import { ExternalLink, MessageSquare, TrendingUp } from 'lucide-react';
import { AnalysisResult } from '../lib/scrapers/types';

interface EngagementTargetsProps {
  targets: AnalysisResult['engagement_targets'];
}

export function EngagementTargets({ targets }: EngagementTargetsProps) {
  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'reddit':
        return 'bg-[#FF4500]/10 border-[#FF4500]/30 text-[#FF4500]';
      case 'youtube':
        return 'bg-[#FF0000]/10 border-[#FF0000]/30 text-[#FF0000]';
      case 'facebook':
        return 'bg-primary/10 border-primary/30 text-primary';
      default:
        return 'bg-muted-foreground/10 border-muted-foreground/30 text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border"></div>
        <h2 className="text-2xl font-bold text-foreground">Engagement Targets</h2>
        <div className="h-px flex-1 bg-border"></div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {targets.map((target, idx) => (
          <div
            key={idx}
            className="group bg-surface border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-glow"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-foreground text-lg">@{target.creator_handle}</h3>
                  <a
                    href={target.post_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors group/link"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover/link:text-primary transition-colors" />
                  </a>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${getPlatformColor(target.platform)}`}
                >
                  {target.platform.toUpperCase()}
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{target.summary}</p>

            <div className="space-y-4 bg-muted/30 rounded-lg p-4 border border-border/50">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Pain Point Match
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{target.pain_point_match}</p>
              </div>

              <div className="h-px bg-border/50"></div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-3.5 h-3.5 text-accent" />
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Recommended Engagement
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{target.recommended_engagement}</p>
                <br />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Example Outreach
                  </h4>
                  <br />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {target.example_outreach}
                  </p>
                </div>

              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
