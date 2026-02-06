export async function generateSearchQueries(prompt: string, mode: "tabb" | "lunim" | "general"): Promise<{ youtube: string[]; reddit: string[]; facebook: string[] }> {
    const modeContext = mode === 'tabb'
    ? 'Focus on filmmaking, video production, and creative collaboration topics'
    : mode === 'lunim'
    ? 'Focus on creative technology, AI tools, and design innovation topics'
    : 'Focus on general creator content, cross-platform trends, and broad audience interests';
  const res = await fetch("/api/generate-queries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, mode }),
  });

  if (!res.ok) {
    throw new Error("Failed to generate search queries");
  }

  return res.json();
}
