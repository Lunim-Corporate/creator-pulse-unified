"use client";
import { useEffect, useState } from "react";

export type Mode = "tabb" | "lunim" | "general";

export interface SavedPrompt {
  id: string;
  label: string;
  prompt: string;
  mode: Mode;
}

export function useSavedPrompts() {
  const [mode, setMode] = useState<Mode>("general");
  const [prompts, setPrompts] = useState<Record<Mode, SavedPrompt[]>>({
    tabb: [],
    lunim: [],
    general: []
  });

  useEffect(() => {
    fetch('api/prompts') 
      .then((res) => res.json())
      .then((data: SavedPrompt[]) => {
        const grouped: Record<Mode, SavedPrompt[]> = {
          tabb: [],
          lunim: [],
          general: []
        };

        data.forEach((prompt) => {
          if (prompt.mode in grouped) {
            grouped[prompt.mode].push(prompt);
          }
        });

        setPrompts(grouped);
      })
      .catch(console.error);
  }, []); 

  const savePrompt = async (targetMode: Mode, label: string, prompt: string) => {
    console.log("Saving prompt", { targetMode, label, prompt });

    const res = await fetch("api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        mode: targetMode, 
        label,
        prompt,
      }),
    });

    if (!res.ok) {
      console.error("Failed to save prompt");
      return;
    }

    const saved = await res.json();
    console.log("Saved prompt response", saved);

    setPrompts((prev) => ({
      ...prev,
      [targetMode]: [saved, ...(prev[targetMode] ?? [])],
    }));
  };

  const deletePrompt = async (targetMode: Mode, id: string) => {
    const res = await fetch("api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        id,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to delete prompt");
    }

    setPrompts((prev) => ({
      ...prev,
      [targetMode]: prev[targetMode].filter((p) => p.id !== id),
    }));
  };

  return {
    mode,
    setMode,
    prompts,
    savePrompt,
    deletePrompt,
  };
}