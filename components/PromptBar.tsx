"use client";
import { useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { Mode, SavedPrompt } from "../state/useSavedPrompts";

interface PromptBarProps {
  prompt: string;
  setPrompt: (p: string) => void;
  onGenerateQueries: () => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  prompts: Record<Mode, SavedPrompt[]>;
  savePrompt: (mode: Mode, label: string, prompt: string) => void;
  deletePrompt: (mode: Mode, id: string) => void;
}

export function PromptBar({
  prompt,
  setPrompt,
  onGenerateQueries,
  mode,
  setMode,
  prompts,
  savePrompt,
  deletePrompt,
}: PromptBarProps) {
  const [newLabel, setNewLabel] = useState("");
  const activePrompts = prompts[mode] ?? [];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex border-b border-border">
      <button
        className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
          mode === "general"
            ? "bg-primary text-primary-foreground"
            : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
        }`}
        onClick={() => setMode("general" as Mode)}
      >
        General Mode
      </button>
      <button
        className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
          mode === "tabb"
            ? "bg-primary text-primary-foreground"
            : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
        }`}
        onClick={() => setMode("tabb" as Mode)}
      >
        Tabb Mode
      </button>
      <button
        className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
          mode === "lunim"
            ? "bg-primary text-primary-foreground"
            : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
        }`}
        onClick={() => setMode("lunim" as Mode)}
      >
        Lunim Mode
      </button>
</div>

      <div className="p-6 space-y-5">

  {activePrompts.length > 0 && (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Saved Prompts
        </span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {activePrompts.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {activePrompts.map((p) => (
          <button
            key={p.id}
            onClick={() => setPrompt(p.prompt)}
            className="group text-sm px-3 py-1.5 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
          >
            <span>{p.label}</span>
            <Trash2
              className="w-3 h-3 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e: React.MouseEvent<SVGSVGElement>) => {
              e.stopPropagation();
              deletePrompt(mode, p.id);
            }}

            />
          </button>
        ))}
      </div>
    </div>
  )}

  <div className="space-y-2">
    <label className="text-sm font-medium text-foreground">
      Research Prompt
    </label>
    <textarea
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      className="w-full h-32 p-4 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-ring focus:outline-none"
      placeholder="Describe what you want Creator Pulse to research..."
    />
  </div>

  <div className="flex gap-3">
    {/* <button
      onClick={onGenerateQueries}
      className="flex-1 bg-primary text-primary-foreground px-4 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity flex justify-center items-center gap-2"
    >
      <Search className="w-4 h-4" />
      Generate Queries
    </button> */}

    <div className="flex gap-2">
      <input
        placeholder="Label..."
        value={newLabel}
        onChange={(e) => setNewLabel(e.target.value)}
        className="w-32 p-3 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none"
      />
      <button
        onClick={() => {
          if (!newLabel.trim() || !prompt.trim()) return;
          savePrompt(mode, newLabel.trim(), prompt.trim());
          setNewLabel("");
        }}
        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg flex items-center gap-2 font-medium hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" />
        Save
      </button>
    </div>
  </div>
      </div>
    </div>
  );
}
