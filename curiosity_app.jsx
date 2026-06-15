import { useState, useCallback, useEffect, useRef } from "react";

// ─── TOKENS ────────────────────────────────────────────────────────────────
const T = {
  bg: "#07070d", surface: "#0f0f1a", surfaceHigh: "#161624",
  border: "rgba(255,255,255,0.07)", text: "#f0f0f5", muted: "#6b6b80",
  faint: "#2a2a3d", purple: "#9b6dff", purpleDim: "rgba(155,109,255,0.18)",
  green: "#22d3a0", red: "#ff5c6a", gold: "#f5c842", cyan: "#67e8f9",
};

const TOPICS = [
  { id: "psychology",    label: "Psychology",       emoji: "🧠", color: "#a78bfa", group: "mind"    },
  { id: "neuroscience",  label: "Neuroscience",     emoji: "⚡", color: "#fbbf24", group: "mind"    },
  { id: "philosophy",    label: "Philosophy",       emoji: "💭", color: "#818cf8", group: "mind"    },
  { id: "finance",       label: "Finance",          emoji: "📈", color: "#34d399", group: "world"   },
  { id: "intlrelations", label: "Int'l Relations",  emoji: "🌍", color: "#38bdf8", group: "world"   },
  { id: "news",          label: "News & World",     emoji: "📰", color: "#2dd4bf", group: "world"   },
  { id: "technology",    label: "Technology",       emoji: "🚀", color: "#60a5fa", group: "world"   },
  { id: "culture",       label: "Culture",          emoji: "🎨", color: "#f472b6", group: "culture" },
  { id: "fashion",       label: "Fashion & Beauty", emoji: "✨", color: "#fb7185", group: "culture" },
  { id: "popculture",    label: "Pop Culture",      emoji: "🎬", color: "#c084fc", group: "culture" },
];

// ─── DAILY ROTATION ────────────────────────────────────────────────────────
function getDailyFreeTopics() {
  const d = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const mind    = TOPICS.filter(t => t.group === "mind");
  const world   = TOPICS.filter(t => t.group === "world");
  const culture = TOPICS.filter(t => t.group === "culture");
  return [mind[d % mind.length], world[d % world.length], culture[d % culture.length]];
}

// ─── FAKE LEADERBOARD DATA ──────────────────────────────────────────────────
const LEADERBOARD_DATA = [
  { name: "Sofia M.",   avatar: "🦋", xp: 2840, streak: 21, country: "🇧🇷" },
  { name: "Kai T.",     avatar: "⚡", xp: 2610, streak: 18, country: "🇯🇵" },
  { name: "Priya R.",   avatar: "🌸", xp: 2430, streak: 14, country: "🇮🇳" },
  { name: "You",        avatar: "🎯", xp: 0,    streak: 4,  country: "🇨🇦", isYou: true },
  { name: "Luca B.",    avatar: "🔥", xp: 1890, streak: 9,  country: "🇮🇹" },
  { name: "Amara K.",   avatar: "🌙", xp: 1740, streak: 7,  country: "🇳🇬" },
  { name: "Ethan W.",   avatar: "🚀", xp: 1320, streak: 5,  country: "🇺🇸" },
  { name: "Hana L.",    avatar: "🌿", xp: 980,  streak: 3,  country: "🇰🇷" },
  { name: "Omar F.",    avatar: "🎨", xp: 750,  streak: 2,  country: "🇪🇬" },
  { name: "Zoe P.",     avatar: "💫", xp: 420,  streak: 1,  country: "🇦🇺" },
];

// ─── AI GENERATOR ──────────────────────────────────────────────────────────
async function generateLesson(topicLabel, hint = "") {
  const prompt = `You are a lesson generator for a Duolingo-style app called Curiosity. Generate a lesson about "${topicLabel}".${hint ? ` Focus on: ${hint}.` : " Pick a fresh, specific, surprising angle — not the most obvious concept."}

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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  const raw = data.content?.map(b => b.text || "").join("") || "";
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── RICH TEXT ─────────────────────────────────────────────────────────────
function RichText({ text, onWord }) {
  if (!text) return null;
  const tokens = [];
  const re = /\*\*(.*?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: "plain", text: text.slice(last, m.index) });
    if (m[1] !== undefined) tokens.push({ type: "bold", text: m[1] });
    else tokens.push({ type: "def", word: m[2], def: m[3] });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ type: "plain", text: text.slice(last) });
  return (
    <span>{tokens.map((t, i) => {
      if (t.type === "plain") return <span key={i}>{t.text}</span>;
      if (t.type === "bold") return <span key={i} style={{ color: "#c4b5fd", fontWeight: 700 }}>{t.text}</span>;
      return <span key={i} onClick={() => onWord && onWord(t.word, t.def)} style={{ color: T.cyan, borderBottom: "1px dotted " + T.cyan, cursor: "pointer", fontWeight: 600 }}>{t.word}</span>;
    })}</span>
  );
}

function XpBar({ label, value, color, max = 200 }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
        <span style={{ color: "#aaa" }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value} XP</span>
      </div>
      <div style={{ background: T.faint, borderRadius: 99, height: 7, overflow: "hidden" }}>
        <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

function Spinner({ color, size = 44 }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `3px solid ${T.faint}`, borderTop: `3px solid ${color}`, animation: "spin 0.8s linear infinite", margin: "0 auto" }} />;
}

function TooltipModal({ tooltip, onClose }) {
  if (!tooltip) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-end", zIndex: 300, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surfaceHigh, borderRadius: "20px 20px 0 0", padding: "28px 22px 38px", width: "100%", borderTop: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Definition</div>
        <div style={{ fontSize: 21, fontWeight: 800, color: T.cyan, marginBottom: 12 }}>{tooltip.word}</div>
        <div style={{ fontSize: 15, color: "#ccc", lineHeight: 1.65 }}>{tooltip.def}</div>
        <button onClick={onClose} style={{ marginTop: 20, width: "100%", background: T.faint, border: "none", borderRadius: 12, padding: "12px", color: "#aaa", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Got it</button>
      </div>
    </div>
  );
}

// ─── PAYWALL ───────────────────────────────────────────────────────────────
function Paywall({ onUpgrade, onClose }) {
  const [yearly, setYearly] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "flex-end", backdropFilter: "blur(8px)" }}>
      <div style={{ background: T.surface, borderRadius: "28px 28px 0 0", padding: "32px 22px 44px", width: "100%", borderTop: "1px solid rgba(155,109,255,0.3)", maxHeight: "88vh", overflowY: "auto", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: T.faint, border: "none", borderRadius: 99, width: 30, height: 30, color: T.muted, fontSize: 14, cursor: "pointer" }}>✕</button>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>👑</div>
          <div style={{ fontSize: 23, fontWeight: 900 }}>Curiosity <span style={{ color: T.gold }}>Premium</span></div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 5 }}>Learn without limits.</div>
        </div>
        {[
          ["♾️", "All 10 topics, every day", "Free rotates 3. Premium unlocks all 10."],
          ["✨", "Unlimited AI-generated lessons", "Generate as many fresh lessons as you want."],
          ["📖", "Full deep-dive sections", "Go deeper after every quiz."],
          ["🏆", "Global leaderboard", "Compete with learners worldwide."],
          ["📊", "Full XP tracking", "Every subject, every day."],
        ].map(([icon, title, sub], i) => (
          <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
            <div><div style={{ fontWeight: 800, fontSize: 14 }}>{title}</div><div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{sub}</div></div>
          </div>
        ))}
        <div style={{ display: "flex", background: T.faint, borderRadius: 14, padding: 4, marginTop: 22, marginBottom: 16 }}>
          {["Monthly", "Yearly"].map((p, i) => (
            <button key={p} onClick={() => setYearly(i === 1)} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 11, cursor: "pointer", fontFamily: "inherit", background: (yearly ? i === 1 : i === 0) ? T.purple : "transparent", color: (yearly ? i === 1 : i === 0) ? "#fff" : T.muted, fontWeight: 800, fontSize: 14, transition: "all 0.2s", position: "relative" }}>
              {p}{i === 1 && <span style={{ position: "absolute", top: -8, right: 6, background: T.green, color: "#000", fontSize: 9, fontWeight: 900, padding: "2px 5px", borderRadius: 99 }}>-40%</span>}
            </button>
          ))}
        </div>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 36, fontWeight: 900 }}>{yearly ? "$5.99" : "$9.99"}</span>
          <span style={{ fontSize: 15, color: T.muted }}>/{yearly ? "mo" : "month"}</span>
          {yearly && <div style={{ fontSize: 12, color: T.green, marginTop: 3, fontWeight: 700 }}>Billed $71.88/yr · Save $48</div>}
        </div>
        <button onClick={onUpgrade} style={{ width: "100%", background: "linear-gradient(135deg, #f5c842, #f59e0b)", border: "none", borderRadius: 16, padding: "16px", color: "#000", fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>
          Start Premium — {yearly ? "$71.88/yr" : "$9.99/mo"}
        </button>
        <div style={{ textAlign: "center", fontSize: 11, color: T.muted, marginTop: 10 }}>Cancel anytime</div>
      </div>
    </div>
  );
}

// ─── LESSON READER ─────────────────────────────────────────────────────────
function LessonReader({ topic, lesson, onQuiz, onBack }) {
  const [tooltip, setTooltip] = useState(null);
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',-apple-system,sans-serif", paddingBottom: 60 }}>
      <TooltipModal tooltip={tooltip} onClose={() => setTooltip(null)} />
      <div style={{ background: `linear-gradient(160deg,${topic.color}28 0%,${T.bg} 65%)`, padding: "28px 18px 24px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 18 }}>← Home</button>
        <div style={{ fontSize: 10, color: topic.color, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>{topic.emoji} {topic.label}</div>
        <div style={{ fontSize: 24, fontWeight: 900, marginTop: 8, lineHeight: 1.28, letterSpacing: "-0.5px" }}>{lesson.title}</div>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ background: topic.color + "22", color: topic.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>3 min read</span>
          <span style={{ background: T.faint, color: T.muted, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>+15 XP for correct</span>
        </div>
      </div>
      <div style={{ padding: "20px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, background: "rgba(103,232,249,0.07)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(103,232,249,0.15)" }}>
          <span>💡</span><span style={{ fontSize: 12, color: T.cyan }}>Tap underlined words to see definitions</span>
        </div>
        <div style={{ background: T.surface, borderRadius: 20, padding: "20px 18px", fontSize: 16, lineHeight: 1.85, color: "#d4d4e8", border: `1px solid ${T.border}` }}>
          <RichText text={lesson.content} onWord={(w, d) => setTooltip({ word: w, def: d })} />
        </div>
        <div style={{ marginTop: 14, background: `linear-gradient(135deg,${topic.color}18,transparent)`, borderRadius: 16, padding: "16px", border: `1px solid ${topic.color}33`, fontSize: 14, color: "#aaa", lineHeight: 1.65 }}>
          {lesson.fact}
        </div>
        <button onClick={onQuiz} style={{ marginTop: 22, width: "100%", background: `linear-gradient(135deg,${topic.color},#6366f1)`, border: "none", borderRadius: 16, padding: "16px", color: "#fff", fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>
          Take the quiz →
        </button>
      </div>
    </div>
  );
}

// ─── QUIZ ──────────────────────────────────────────────────────────────────
function QuizScreen({ topic, lesson, isPremium, onDone, onBack }) {
  const [sel, setSel] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const correct = submitted && sel === lesson.quiz.answer;
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',-apple-system,sans-serif", paddingBottom: 60 }}>
      <TooltipModal tooltip={tooltip} onClose={() => setTooltip(null)} />
      <div style={{ background: `linear-gradient(160deg,${topic.color}28 0%,${T.bg} 65%)`, padding: "28px 18px 24px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 18 }}>← Back to lesson</button>
        <div style={{ fontSize: 10, color: topic.color, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Quick check · {topic.emoji} {topic.label}</div>
        <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.3, letterSpacing: "-0.4px" }}>{lesson.quiz.question}</div>
      </div>
      <div style={{ padding: "20px 18px" }}>
        {lesson.quiz.options.map((opt, i) => {
          let bg = T.surface, border = `1px solid ${T.border}`, col = "#ccc";
          if (sel === i && !submitted) { bg = `${topic.color}22`; border = `1px solid ${topic.color}`; col = "#fff"; }
          if (submitted && i === lesson.quiz.answer) { bg = "rgba(34,211,160,0.12)"; border = `1px solid ${T.green}`; col = T.green; }
          if (submitted && sel === i && i !== lesson.quiz.answer) { bg = "rgba(255,92,106,0.12)"; border = `1px solid ${T.red}`; col = T.red; }
          return (
            <button key={i} onClick={() => !submitted && setSel(i)} style={{ width: "100%", background: bg, border, borderRadius: 14, padding: "15px 16px", marginBottom: 10, textAlign: "left", color: col, fontSize: 15, cursor: submitted ? "default" : "pointer", transition: "all 0.2s", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, background: submitted && i === lesson.quiz.answer ? "rgba(34,211,160,0.2)" : submitted && sel === i ? "rgba(255,92,106,0.2)" : sel === i ? `${topic.color}33` : T.faint, color: submitted && i === lesson.quiz.answer ? T.green : submitted && sel === i ? T.red : sel === i ? topic.color : T.muted }}>
                {submitted ? (i === lesson.quiz.answer ? "✓" : sel === i ? "✗" : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
              </span>
              <span style={{ lineHeight: 1.4 }}>{opt}</span>
            </button>
          );
        })}
        {!submitted ? (
          <button onClick={() => sel !== null && setSubmitted(true)} disabled={sel === null} style={{ marginTop: 8, width: "100%", background: sel !== null ? `linear-gradient(135deg,${topic.color},#6366f1)` : T.faint, border: "none", borderRadius: 16, padding: "16px", color: sel !== null ? "#fff" : T.muted, fontWeight: 900, fontSize: 16, cursor: sel !== null ? "pointer" : "default", fontFamily: "inherit" }}>
            Check answer
          </button>
        ) : (
          <>
            <div style={{ padding: "16px", borderRadius: 16, marginTop: 8, background: correct ? "rgba(34,211,160,0.1)" : "rgba(255,92,106,0.1)", border: `1px solid ${correct ? T.green : T.red}44`, fontSize: 15, fontWeight: 700, color: correct ? T.green : T.red }}>
              {correct ? "🎉 Correct! +15 XP earned." : `❌ Correct: "${lesson.quiz.options[lesson.quiz.answer]}"`}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {isPremium
                ? <button onClick={() => onDone("depth", correct)} style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "14px", color: "#ccc", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>📖 Go deeper</button>
                : <button onClick={() => onDone("paywall", correct)} style={{ flex: 1, background: T.faint, border: "1px solid rgba(245,200,66,0.3)", borderRadius: 16, padding: "14px", color: T.gold, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>👑 Go deeper</button>
              }
              <button onClick={() => onDone("done", correct)} style={{ flex: 1, background: `linear-gradient(135deg,${topic.color},#6366f1)`, border: "none", borderRadius: 16, padding: "14px", color: "#fff", fontWeight: 900, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Continue →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── DEPTH ─────────────────────────────────────────────────────────────────
function DepthScreen({ topic, lesson, onDone }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',-apple-system,sans-serif", paddingBottom: 80 }}>
      <div style={{ background: `linear-gradient(160deg,${topic.color}20 0%,${T.bg} 55%)`, padding: "28px 18px 22px" }}>
        <div style={{ fontSize: 10, color: topic.color, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>{topic.emoji} Deep dive</div>
        <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.28 }}>{lesson.title}</div>
      </div>
      <div style={{ padding: "20px 18px" }}>
        {lesson.depth.map((s, i) => (
          <div key={i} style={{ marginBottom: 14, background: T.surface, borderRadius: 18, padding: "20px 18px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 10, color: topic.color, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{String(i + 1).padStart(2, "0")}</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, lineHeight: 1.3 }}>{s.heading}</div>
            <div style={{ fontSize: 15, color: "#b0b0c4", lineHeight: 1.75 }}>{s.body}</div>
          </div>
        ))}
        <button onClick={onDone} style={{ width: "100%", background: `linear-gradient(135deg,${topic.color},#6366f1)`, border: "none", borderRadius: 16, padding: "16px", color: "#fff", fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>Complete lesson →</button>
      </div>
    </div>
  );
}

// ─── LEADERBOARD ───────────────────────────────────────────────────────────
function LeaderboardScreen({ totalXp, streak, onBack }) {
  const [tab, setTab] = useState("weekly"); // weekly | alltime
  const board = LEADERBOARD_DATA.map(e => e.isYou ? { ...e, xp: totalXp } : e)
    .sort((a, b) => b.xp - a.xp)
    .map((e, i) => ({ ...e, rank: i + 1 }));
  const youEntry = board.find(e => e.isYou);
  const medal = (r) => r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `#${r}`;
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',-apple-system,sans-serif", paddingBottom: 80 }}>
      <div style={{ background: "linear-gradient(160deg,#1a0038 0%,#07070d 65%)", padding: "28px 18px 24px", borderBottom: `1px solid ${T.border}` }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 18 }}>← Home</button>
        <div style={{ fontSize: 10, color: T.gold, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>🏆 Global Rankings</div>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.5px" }}>Leaderboard</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Resets every Monday · Based on weekly XP</div>
      </div>

      {/* Your card */}
      <div style={{ padding: "16px 18px 0" }}>
        <div style={{ background: `linear-gradient(135deg,${T.purpleDim},rgba(99,102,241,0.15))`, border: `1px solid rgba(155,109,255,0.35)`, borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 30 }}>{youEntry?.avatar}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>Your Ranking</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>🔥 {streak} day streak · {totalXp} XP this week</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: T.purple }}>{medal(youEntry?.rank)}</div>
        </div>
      </div>

      {/* Tab */}
      <div style={{ padding: "16px 18px 0" }}>
        <div style={{ display: "flex", background: T.faint, borderRadius: 14, padding: 4, marginBottom: 16 }}>
          {[["weekly", "This Week"], ["alltime", "All Time"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 11, cursor: "pointer", fontFamily: "inherit", background: tab === key ? T.purple : "transparent", color: tab === key ? "#fff" : T.muted, fontWeight: 800, fontSize: 14, transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {board.map((entry, i) => {
          const isTop3 = entry.rank <= 3;
          const isYou = entry.isYou;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", marginBottom: 8, borderRadius: 16, background: isYou ? T.purpleDim : isTop3 ? `rgba(245,200,66,0.06)` : T.surface, border: `1px solid ${isYou ? "rgba(155,109,255,0.4)" : isTop3 ? "rgba(245,200,66,0.2)" : T.border}`, transition: "all 0.2s" }}>
              {/* Rank */}
              <div style={{ width: 36, textAlign: "center", fontSize: isTop3 ? 22 : 15, fontWeight: 900, color: isTop3 ? T.gold : T.muted, flexShrink: 0 }}>
                {medal(entry.rank)}
              </div>
              {/* Avatar */}
              <div style={{ width: 40, height: 40, borderRadius: 12, background: isYou ? T.purpleDim : T.faint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, border: isYou ? `1px solid ${T.purple}44` : "none" }}>
                {entry.avatar}
              </div>
              {/* Name */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: isYou ? T.purple : T.text }}>{entry.name} {entry.country}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>🔥 {entry.streak} day streak</div>
              </div>
              {/* XP */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: isTop3 ? T.gold : isYou ? T.purple : T.text }}>{tab === "alltime" ? (entry.xp * 12).toLocaleString() : entry.xp}</div>
                <div style={{ fontSize: 10, color: T.muted }}>XP</div>
              </div>
            </div>
          );
        })}
        <div style={{ textAlign: "center", fontSize: 12, color: T.muted, padding: "8px 0 20px" }}>
          Keep learning to climb the rankings! 🚀
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [isPremium, setIsPremium]   = useState(false);
  const [screen, setScreen]         = useState("home"); // home|lesson|quiz|depth|result|profile|leaderboard
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeTopic, setActiveTopic] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null); // which lesson object is shown
  const [lessonPhase, setLessonPhase] = useState("read"); // read|quiz|depth
  const [lastCorrect, setLastCorrect] = useState(false);

  // xp / completion
  const [xpByTopic, setXpByTopic]     = useState(() => Object.fromEntries(TOPICS.map(t => [t.id, 0])));
  const [completedByTopic, setCompletedByTopic] = useState(() => Object.fromEntries(TOPICS.map(t => [t.id, 0]))); // count of completions
  const streak = 4;
  const totalXp = Object.values(xpByTopic).reduce((a, b) => a + b, 0);

  // PRE-GENERATED daily lessons — one per free topic, ready on load
  const [dailyLessons, setDailyLessons] = useState({}); // { topicId: lesson | "loading" | "error" }
  const [extraLessons, setExtraLessons] = useState({}); // { topicId: [lesson, ...] } premium bonus

  const dailyFree = getDailyFreeTopics();

  // Load the 3 free daily lessons in parallel on mount
  useEffect(() => {
    const init = {};
    dailyFree.forEach(t => { init[t.id] = "loading"; });
    setDailyLessons(init);

    dailyFree.forEach(async (t) => {
      try {
        const lesson = await generateLesson(t.label);
        setDailyLessons(prev => ({ ...prev, [t.id]: lesson }));
      } catch {
        setDailyLessons(prev => ({ ...prev, [t.id]: "error" }));
      }
    });
  }, []); // eslint-disable-line

  const isUnlocked = (t) => isPremium || dailyFree.some(d => d.id === t.id);

  // Open a topic's daily lesson
  const openLesson = (topic) => {
    if (!isUnlocked(topic)) { setShowPaywall(true); return; }
    const l = dailyLessons[topic.id];
    setActiveTopic(topic);
    setActiveLesson(l || null);
    setLessonPhase("read");
    setScreen("lesson");
  };

  // Premium: generate a bonus lesson for a topic
  const generateExtra = async (topic) => {
    if (!isPremium) { setShowPaywall(true); return; }
    setActiveTopic(topic);
    setActiveLesson("loading");
    setLessonPhase("read");
    setScreen("lesson");
    try {
      const l = await generateLesson(topic.label, "pick a completely different angle than usual");
      setExtraLessons(prev => ({ ...prev, [topic.id]: [...(prev[topic.id] || []), l] }));
      setActiveLesson(l);
    } catch {
      setActiveLesson("error");
    }
  };

  const finishLesson = (correct) => {
    setLastCorrect(correct);
    const gained = correct ? 15 : 5;
    setXpByTopic(prev => ({ ...prev, [activeTopic.id]: prev[activeTopic.id] + gained }));
    setCompletedByTopic(prev => ({ ...prev, [activeTopic.id]: prev[activeTopic.id] + 1 }));
    setScreen("result");
  };

  const handleQuizDone = (action, correct) => {
    if (action === "paywall") { setShowPaywall(true); return; }
    if (action === "depth")   { setLessonPhase("depth"); setScreen("depth"); return; }
    finishLesson(correct);
  };

  // ─── LOADING LESSON SCREEN ────────────────────────────────────────────
  const LoadingOrErrorLesson = ({ topic, isError, onRetry, onBack }) => (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ background: `linear-gradient(160deg,${topic.color}28 0%,${T.bg} 65%)`, padding: "28px 18px 24px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 18 }}>← Home</button>
        <div style={{ fontSize: 10, color: topic.color, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>{topic.emoji} {topic.label}</div>
        <div style={{ height: 28, width: "70%", background: T.faint, borderRadius: 8, marginTop: 10 }} />
      </div>
      <div style={{ padding: "60px 18px", textAlign: "center" }}>
        {isError ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
            <div style={{ color: T.red, fontWeight: 700, marginBottom: 16 }}>Couldn't load lesson. Check your connection.</div>
            <button onClick={onRetry} style={{ background: `linear-gradient(135deg,${topic.color},#6366f1)`, border: "none", borderRadius: 14, padding: "12px 28px", color: "#fff", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Try again</button>
          </>
        ) : (
          <>
            <Spinner color={topic.color} />
            <div style={{ color: topic.color, fontWeight: 700, fontSize: 15, marginTop: 18, animation: "pulse 1.5s ease infinite" }}>Claude is writing your lesson…</div>
            <div style={{ color: T.muted, fontSize: 13, marginTop: 8 }}>Crafting something fresh just for you</div>
          </>
        )}
      </div>
    </div>
  );

  // ─── RENDER ────────────────────────────────────────────────────────────
  const styles = `@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`;

  // HOME
  if (screen === "home") {
    const allTopicsCompleted = dailyFree.every(t => completedByTopic[t.id] > 0);
    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',-apple-system,sans-serif", paddingBottom: 90 }}>
        <style>{styles}</style>
        {showPaywall && <Paywall onUpgrade={() => { setIsPremium(true); setShowPaywall(false); }} onClose={() => setShowPaywall(false)} />}

        {/* Header */}
        <div style={{ background: "linear-gradient(160deg,#14003a 0%,#07070d 65%)", padding: "32px 18px 22px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.8px" }}>Curiosity<span style={{ color: T.purple }}>.</span></div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
                {isPremium ? <span style={{ color: T.gold }}>👑 Premium · All topics unlocked</span> : "Free · 3 daily AI-generated lessons"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 17, fontWeight: 800, color: T.gold }}>🔥 {streak}</div><div style={{ fontSize: 10, color: T.muted }}>streak</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 17, fontWeight: 800, color: T.purple }}>{totalXp}</div><div style={{ fontSize: 10, color: T.muted }}>XP</div></div>
              <button onClick={() => setScreen("leaderboard")} style={{ background: "rgba(245,200,66,0.1)", border: "1px solid rgba(245,200,66,0.25)", borderRadius: 10, width: 38, height: 38, fontSize: 18, cursor: "pointer" }}>🏆</button>
              <button onClick={() => setScreen("profile")} style={{ background: T.purpleDim, border: "none", borderRadius: 10, width: 38, height: 38, fontSize: 18, cursor: "pointer" }}>👤</button>
            </div>
          </div>
          {/* Progress */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.muted, marginBottom: 7 }}>
              <span>Daily goal</span>
              <span style={{ color: dailyFree.filter(t => completedByTopic[t.id] > 0).length >= 3 ? T.green : T.muted }}>
                {dailyFree.filter(t => completedByTopic[t.id] > 0).length}/3 done
              </span>
            </div>
            <div style={{ background: T.faint, borderRadius: 99, height: 6 }}>
              <div style={{ background: `linear-gradient(90deg,${T.purple},#60a5fa)`, borderRadius: 99, height: 6, width: `${(dailyFree.filter(t => completedByTopic[t.id] > 0).length / 3) * 100}%`, transition: "width 0.6s ease" }} />
            </div>
          </div>
        </div>

        {/* Today's 3 daily lessons */}
        <div style={{ padding: "20px 16px 0" }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, letterSpacing: "-0.3px" }}>Today's Lessons</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} · Refreshes daily</div>

          {dailyFree.map(topic => {
            const lessonState = dailyLessons[topic.id];
            const isLoading = lessonState === "loading";
            const isError = lessonState === "error";
            const isDone = completedByTopic[topic.id] > 0;
            const extraCount = (extraLessons[topic.id] || []).length;
            return (
              <button key={topic.id} onClick={() => openLesson(topic)} style={{ width: "100%", background: isDone ? `${topic.color}10` : T.surface, border: `1px solid ${isDone ? topic.color + "44" : T.border}`, borderRadius: 18, padding: "16px", marginBottom: 10, textAlign: "left", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 50, height: 50, borderRadius: 14, background: `${topic.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{topic.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{topic.label}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {isLoading ? "✨ Generating your lesson…" : isError ? "⚠️ Tap to retry" : lessonState?.title || ""}
                  </div>
                  {isDone && (
                    <div style={{ marginTop: 7, background: T.faint, borderRadius: 99, height: 4 }}>
                      <div style={{ width: `${Math.min((xpByTopic[topic.id] / 150) * 100, 100)}%`, height: "100%", background: topic.color, borderRadius: 99 }} />
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  {isLoading ? <Spinner color={topic.color} size={28} /> :
                    isDone ? <div style={{ color: topic.color, fontSize: 20 }}>✓</div> :
                      <div style={{ background: topic.color, borderRadius: 99, padding: "5px 12px", fontSize: 12, fontWeight: 800, color: "#000" }}>Start</div>}
                  {isPremium && isDone && (
                    <div
                      onClick={e => { e.stopPropagation(); generateExtra(topic); }}
                      style={{ fontSize: 10, color: T.purple, fontWeight: 800, marginTop: 4, cursor: "pointer" }}>
                      +{extraCount} more ✨
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Premium generate more */}
        {isPremium && allTopicsCompleted && (
          <div style={{ padding: "0 16px" }}>
            <div style={{ background: T.purpleDim, border: `1px solid rgba(155,109,255,0.3)`, borderRadius: 16, padding: "14px 16px", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.purple, marginBottom: 4 }}>✨ Want more? Generate bonus lessons</div>
              <div style={{ fontSize: 12, color: T.muted }}>Tap the "+more" badge on any topic above to get a brand-new AI lesson on that subject.</div>
            </div>
          </div>
        )}

        {/* Premium locked topics */}
        <div style={{ padding: "20px 16px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              {isPremium ? "More Topics" : "Premium Topics"}
              {!isPremium && <span style={{ marginLeft: 8, background: T.gold + "22", color: T.gold, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 99 }}>👑 $9.99/mo</span>}
            </div>
            {!isPremium && <button onClick={() => setShowPaywall(true)} style={{ background: "linear-gradient(135deg,#f5c842,#f59e0b)", border: "none", borderRadius: 10, padding: "7px 14px", color: "#000", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Unlock all</button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {TOPICS.filter(t => !dailyFree.some(d => d.id === t.id)).map(topic => {
              const unlocked = isPremium;
              const done = completedByTopic[topic.id] > 0;
              return (
                <button key={topic.id} onClick={() => unlocked ? (done ? generateExtra(topic) : openLesson(topic)) : setShowPaywall(true)} style={{ background: unlocked && done ? `${topic.color}10` : T.surface, border: `1px solid ${unlocked && done ? topic.color + "44" : T.border}`, borderRadius: 18, padding: "16px 14px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", position: "relative", opacity: unlocked ? 1 : 0.65 }}>
                  {!unlocked && <div style={{ position: "absolute", top: 10, right: 10, fontSize: 14 }}>🔒</div>}
                  <div style={{ fontSize: 26, marginBottom: 8 }}>{topic.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: unlocked ? T.text : T.muted }}>{topic.label}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                    {unlocked ? (done ? `${xpByTopic[topic.id]} XP · Tap for more` : "Tap to generate") : "Premium only"}
                  </div>
                </button>
              );
            })}
          </div>
          {!isPremium && (
            <button onClick={() => setShowPaywall(true)} style={{ marginTop: 16, width: "100%", background: "linear-gradient(135deg,#1a0845,#0c1240)", border: "1px solid rgba(245,200,66,0.3)", borderRadius: 18, padding: "18px", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>👑</div>
              <div style={{ fontWeight: 900, fontSize: 15, color: T.gold }}>Go Premium for $9.99/mo</div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>All 10 topics · Unlimited AI lessons · Deep dives · Leaderboard</div>
            </button>
          )}
        </div>
      </div>
    );
  }

  // LESSON
  if (screen === "lesson") {
    if (activeLesson === "loading") return <LoadingOrErrorLesson topic={activeTopic} isError={false} onBack={() => setScreen("home")} />;
    if (activeLesson === "error")   return <LoadingOrErrorLesson topic={activeTopic} isError={true} onRetry={() => generateExtra(activeTopic)} onBack={() => setScreen("home")} />;
    if (dailyLessons[activeTopic?.id] === "loading") return <LoadingOrErrorLesson topic={activeTopic} isError={false} onBack={() => setScreen("home")} />;
    if (dailyLessons[activeTopic?.id] === "error")   return <LoadingOrErrorLesson topic={activeTopic} isError={true} onRetry={() => { setDailyLessons(prev => ({ ...prev, [activeTopic.id]: "loading" })); generateLesson(activeTopic.label).then(l => setDailyLessons(prev => ({ ...prev, [activeTopic.id]: l }))).catch(() => setDailyLessons(prev => ({ ...prev, [activeTopic.id]: "error" }))); }} onBack={() => setScreen("home")} />;
    const lesson = activeLesson || dailyLessons[activeTopic?.id];
    if (!lesson) return <LoadingOrErrorLesson topic={activeTopic} isError={false} onBack={() => setScreen("home")} />;
    return <LessonReader topic={activeTopic} lesson={lesson} onBack={() => setScreen("home")} onQuiz={() => setScreen("quiz")} />;
  }

  // QUIZ
  if (screen === "quiz") {
    const lesson = activeLesson || dailyLessons[activeTopic?.id];
    return <QuizScreen topic={activeTopic} lesson={lesson} isPremium={isPremium} onDone={handleQuizDone} onBack={() => setScreen("lesson")} />;
  }

  // DEPTH
  if (screen === "depth") {
    const lesson = activeLesson || dailyLessons[activeTopic?.id];
    return <DepthScreen topic={activeTopic} lesson={lesson} onDone={() => finishLesson(lastCorrect)} />;
  }

  // RESULT
  if (screen === "result") return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',-apple-system,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
      {showPaywall && <Paywall onUpgrade={() => { setIsPremium(true); setShowPaywall(false); }} onClose={() => setShowPaywall(false)} />}
      <div style={{ fontSize: 70, marginBottom: 18 }}>{lastCorrect ? "🎉" : "💪"}</div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.6px" }}>{lastCorrect ? "Lesson Complete!" : "Knowledge Acquired!"}</div>
      <div style={{ fontSize: 15, color: T.muted, marginTop: 8 }}>{lastCorrect ? "Sharp. That knowledge is yours now." : "Getting it wrong is how you remember it."}</div>
      <div style={{ marginTop: 28, display: "flex", gap: 16, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, padding: "20px 24px" }}>
        <div><div style={{ fontSize: 26, fontWeight: 900, color: T.gold }}>🔥 {streak}</div><div style={{ fontSize: 11, color: T.muted }}>streak</div></div>
        <div style={{ width: 1, background: T.border }} />
        <div><div style={{ fontSize: 26, fontWeight: 900, color: T.purple }}>+{lastCorrect ? 15 : 5}</div><div style={{ fontSize: 11, color: T.muted }}>XP</div></div>
        <div style={{ width: 1, background: T.border }} />
        <div><div style={{ fontSize: 26, fontWeight: 900, color: T.green }}>{Object.values(completedByTopic).reduce((a,b) => a + (b > 0 ? 1 : 0), 0)}</div><div style={{ fontSize: 11, color: T.muted }}>topics</div></div>
      </div>
      <div style={{ marginTop: 22, width: "100%", maxWidth: 380 }}>
        <XpBar label={activeTopic?.label} value={xpByTopic[activeTopic?.id] || 0} color={activeTopic?.color} max={150} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, width: "100%", maxWidth: 380 }}>
        {isPremium
          ? <button onClick={() => generateExtra(activeTopic)} style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px", color: "#ccc", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>✨ New lesson</button>
          : <button onClick={() => setShowPaywall(true)} style={{ flex: 1, background: T.faint, border: "1px solid rgba(245,200,66,0.3)", borderRadius: 14, padding: "14px", color: T.gold, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>👑 More</button>
        }
        <button onClick={() => setScreen("home")} style={{ flex: 2, background: `linear-gradient(135deg,${activeTopic?.color || T.purple},#6366f1)`, border: "none", borderRadius: 14, padding: "14px", color: "#fff", fontWeight: 900, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Back to Home</button>
      </div>
    </div>
  );

  // LEADERBOARD
  if (screen === "leaderboard") return <LeaderboardScreen totalXp={totalXp} streak={streak} onBack={() => setScreen("home")} />;

  // PROFILE
  if (screen === "profile") return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',-apple-system,sans-serif", paddingBottom: 60 }}>
      {showPaywall && <Paywall onUpgrade={() => { setIsPremium(true); setShowPaywall(false); }} onClose={() => setShowPaywall(false)} />}
      <div style={{ background: "linear-gradient(160deg,#14003a 0%,#07070d 65%)", padding: "28px 18px 24px", borderBottom: `1px solid ${T.border}` }}>
        <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: T.muted, fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 18 }}>← Home</button>
        <div style={{ fontSize: 10, color: T.purple, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Your Profile</div>
        <div style={{ fontSize: 26, fontWeight: 900 }}>Learning Stats</div>
        {isPremium && <div style={{ marginTop: 8, display: "inline-block", background: T.gold + "22", color: T.gold, fontSize: 12, fontWeight: 800, padding: "3px 12px", borderRadius: 99 }}>👑 Premium Member</div>}
      </div>
      <div style={{ padding: "22px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
          {[["🔥 " + streak, "day streak", T.gold], [totalXp, "total XP", T.purple], [Object.values(completedByTopic).reduce((a,b)=>a+b,0), "lessons done", T.green]].map(([v, s, c], i) => (
            <div key={i} style={{ background: T.surface, borderRadius: 16, padding: "16px 10px", border: `1px solid ${T.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{v}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{s}</div>
            </div>
          ))}
        </div>
        <div style={{ background: T.surface, borderRadius: 20, padding: "20px 18px", border: `1px solid ${T.border}`, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 18 }}>XP by Subject</div>
          {TOPICS.map(t => {
            const locked = !isPremium && !dailyFree.some(d => d.id === t.id);
            return locked
              ? <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, opacity: 0.35 }}>
                  <span style={{ fontSize: 12, color: T.muted, width: 130 }}>{t.emoji} {t.label}</span>
                  <div style={{ flex: 1, background: T.faint, borderRadius: 99, height: 7 }} />
                  <span style={{ fontSize: 11, color: T.muted }}>🔒</span>
                </div>
              : <XpBar key={t.id} label={`${t.emoji} ${t.label}`} value={xpByTopic[t.id]} color={t.color} max={150} />;
          })}
        </div>
        {!isPremium
          ? <button onClick={() => setShowPaywall(true)} style={{ width: "100%", background: "linear-gradient(135deg,#f5c842,#f59e0b)", border: "none", borderRadius: 16, padding: "16px", color: "#000", fontWeight: 900, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>👑 Upgrade to Premium — $9.99/mo</button>
          : <button onClick={() => setIsPremium(false)} style={{ width: "100%", background: T.faint, border: `1px solid ${T.border}`, borderRadius: 16, padding: "14px", color: T.muted, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cancel Premium (demo)</button>
        }
      </div>
    </div>
  );

  return null;
}
