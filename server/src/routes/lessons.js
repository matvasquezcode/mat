import express from "express";
import db from "../db.js";
import { generateLessonFromClaude } from "../anthropic.js";

const router = express.Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// POST /api/generate-lesson
// body: { topic: string, topicId?: string, hint?: string }
//
// When `topicId` is provided and `hint` is empty, this is one of the day's
// 3 free lessons — identical for every visitor, so it's generated once per
// day and cached in SQLite. Requests with a `hint` (premium "bonus" lessons)
// are always generated fresh and never cached.
router.post("/generate-lesson", async (req, res) => {
  const { topic, topicId, hint } = req.body || {};
  if (!topic) return res.status(400).json({ error: "topic is required" });

  const isDailyLesson = Boolean(topicId) && !hint;
  const date = todayStr();

  if (isDailyLesson) {
    const cached = db.prepare(
      "SELECT lesson_json FROM daily_lessons WHERE date = ? AND topic_id = ?"
    ).get(date, topicId);
    if (cached) return res.json(JSON.parse(cached.lesson_json));
  }

  try {
    const lesson = await generateLessonFromClaude(topic, hint);

    if (isDailyLesson) {
      db.prepare(`
        INSERT INTO daily_lessons (date, topic_id, lesson_json) VALUES (?, ?, ?)
        ON CONFLICT(date, topic_id) DO UPDATE SET lesson_json = excluded.lesson_json
      `).run(date, topicId, JSON.stringify(lesson));
    }

    res.json(lesson);
  } catch (err) {
    console.error("generate-lesson failed:", err.message);
    res.status(502).json({ error: "lesson generation failed" });
  }
});

export default router;
