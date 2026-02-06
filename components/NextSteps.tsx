import { CheckCircle2, ArrowRight } from "lucide-react";

interface NextStepsProps {
  next_steps: {
    step: string;
    priority: "high" | "medium" | "low";
    expected_impact: string;
  }[];
}

const priorityStyles: Record<
  "high" | "medium" | "low",
  string
> = {
  high: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  medium: "bg-accent/10 text-accent border-accent/30",
  low: "bg-muted/20 text-muted-foreground border-border/40",
};

export function NextSteps({ next_steps }: NextStepsProps) {
  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border"></div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          Clear Next Steps
        </h2>
        <div className="h-px flex-1 bg-border"></div>
      </div>

      <div className="space-y-4">
        {next_steps.map((item, idx) => (
          <div
            key={idx}
            className="bg-surface border border-border rounded-xl p-6 hover:border-primary/40 hover:shadow-glow transition-all duration-300 animate-slide-up"
            style={{ animationDelay: `${idx * 0.08}s` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <h3 className="font-semibold text-foreground text-lg">{item.step}</h3>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.expected_impact}
                </p>
              </div>

              <div
                className={`px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wide min-w-[90px] text-center ${priorityStyles[item.priority]}`}
              >
                {item.priority} priority
              </div>
            </div>

            <div className="h-px bg-border/60 my-4"></div>

            <div className="flex items-center gap-2 text-primary font-medium text-sm group cursor-pointer">
              Begin this step
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
