import express from "express";
import db from "../db.js";

const router = express.Router();

// GET /api/leaderboard -> top users by XP
router.get("/leaderboard", (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, avatar, country, xp, streak, is_premium AS isPremium
    FROM users
    ORDER BY xp DESC
    LIMIT 50
  `).all();
  res.json(rows.map(r => ({ ...r, isPremium: Boolean(r.isPremium) })));
});

// POST /api/leaderboard/me -> upsert the current user's standing
// Identified via the x-user-id header (a client-generated UUID, no auth).
// body: { name?, avatar?, country?, xp, streak, isPremium }
router.post("/leaderboard/me", (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(400).json({ error: "x-user-id header is required" });

  const { name = "You", avatar = "🎯", country = "🌐", xp = 0, streak = 0, isPremium = false } = req.body || {};

  db.prepare(`
    INSERT INTO users (id, name, avatar, country, xp, streak, is_premium, updated_at)
    VALUES (@id, @name, @avatar, @country, @xp, @streak, @isPremium, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = @name, avatar = @avatar, country = @country,
      xp = @xp, streak = @streak, is_premium = @isPremium, updated_at = datetime('now')
  `).run({ id: userId, name, avatar, country, xp, streak, isPremium: isPremium ? 1 : 0 });

  res.json({ ok: true });
});

export default router;
