import { Workflow, Lightbulb } from "lucide-react";

interface AutomationOpportunitiesProps {
  automation_spots: {
    task: string;
    why_automation_helps: string;
    proposed_automation_flow: string;
  }[];
}

export function AutomationOpportunities({ automation_spots }: AutomationOpportunitiesProps) {
  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border"></div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          Automation Opportunities
        </h2>
        <div className="h-px flex-1 bg-border"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {automation_spots.map((spot, idx) => (
          <div
            key={idx}
            className="bg-surface border border-border rounded-xl p-6 hover:border-primary/40 hover:shadow-glow transition-all duration-300 space-y-5"
            style={{ animationDelay: `${idx * 0.08}s` }}
          >
            {/* Task Header */}
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Workflow className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">{spot.task}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                  A high-leverage workflow that can be automated to improve speed, accuracy, and
                  consistency across creator analysis operations.
                </p>
              </div>
            </div>

            {/* Why Automation Helps */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-accent" />
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">
                  Why Automation Helps
                </h4>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {spot.why_automation_helps}
              </p>
            </div>

            {/* Proposed Automation Flow */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-success" />
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">
                  Proposed Automation Flow
                </h4>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {spot.proposed_automation_flow}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
