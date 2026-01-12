"use client";
import { useEffect, useState } from "react";

export type Mode = "tabb" | "lunim";

export interface SavedPrompt {
  id: string;
  label: string;
  prompt: string;
  mode: Mode;
}

export function useSavedPrompts() {
  const [mode, setMode] = useState<Mode>("tabb");
  const [prompts, setPrompts] = useState<Record<Mode, SavedPrompt[]>>({
    tabb: [],
    lunim: [],
  });

  useEffect(() => {
    fetch(`api/prompts?mode=${mode}`)
      .then((res) => res.json())
      .then((data: SavedPrompt[]) => {
        setPrompts((prev) => ({
          ...prev,
          [mode]: data,
        }));
      })
      .catch(console.error);
  }, [mode]);

  const savePrompt = async (targetMode: Mode, label: string, prompt: string) => {
    console.log("Saving prompt", { targetMode, label, prompt });

    const res = await fetch("api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        mode,
        label,
        prompt,
      }),
    });



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
