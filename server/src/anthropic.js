const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

function buildPrompt(topicLabel, hint) {
  return `You are a lesson generator for a Duolingo-style app called Curiosity. Generate a lesson about "${topicLabel}".${hint ? ` Focus on: ${hint}.` : " Pick a fresh, specific, surprising angle — not the most obvious concept."}

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{
  "title": "Short compelling title, max 8 words",
  "content": "2-3 sentence lesson. Use **word** for key bold terms. Use [word](plain English definition in under 12 words) for at least 2 hard vocabulary words.",
  "fact": "One surprising fact starting with a relevant emoji",
  "quiz": {
    "question": "A clear multiple-choice question about the lesson",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 1
  },
  "depth": [
    { "heading": "Short heading", "body": "2-3 sentences of deeper insight or research." },
    { "heading": "Short heading", "body": "2-3 sentences of historical or real-world context." },
    { "heading": "Short heading", "body": "2-3 sentences on everyday relevance." }
  ]
}`;
}

export async function generateLessonFromClaude(topicLabel, hint = "") {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: buildPrompt(topicLabel, hint) }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const raw = data.content?.map(b => b.text || "").join("") || "";
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
