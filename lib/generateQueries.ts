export async function generateSearchQueries(prompt: string, mode: "tabb" | "lunim") {
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
