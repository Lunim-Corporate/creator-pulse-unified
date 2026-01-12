import { Mode } from "../state/useSavedPrompts";
import type { AnalysisResult } from "./scrapers/types";

class AnalysisApiClient {
  async analyzePosts(
    posts: any[],
    prompt: string,
    mode: Mode
  ): Promise<AnalysisResult> {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        posts,
        prompt,
        mode,
      }),
    });

    if (!res.ok) {
      throw new Error("Analyze request failed");
    }

    return res.json();
  }
}

export { AnalysisApiClient };
