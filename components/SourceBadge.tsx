
import { Shield, TrendingUp } from "lucide-react";

interface SourceBadgeProps {
  sources?: string[];
  verified?: boolean;
  size?: 'sm' | 'md';
}

export function SourceBadge({ sources, verified, size = 'sm' }: SourceBadgeProps) {
  if (!sources || sources.length === 0) return null;

  const isMultiSource = sources.length > 1;
  const hasPerplexity = sources.includes('perplexity');

  if (!hasPerplexity && !isMultiSource) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1'
  };

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <div className="flex items-center gap-1.5">
      {hasPerplexity && (
        <span 
          className={`inline-flex items-center gap-1 ${sizeClasses[size]} font-semibold rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20`}
          title="Verified and enhanced by Perplexity AI"
        >
          <Shield className={iconSize} />
          {size === 'md' && 'Verified'}
        </span>
      )}
      
      {isMultiSource && (
        <span 
          className={`inline-flex items-center gap-1 ${sizeClasses[size]} font-semibold rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20`}
          title={`Found by: ${sources.join(', ')}`}
        >
          <TrendingUp className={iconSize} />
          {size === 'md' && 'Multi-source'}
        </span>
      )}
    </div>
  );
}