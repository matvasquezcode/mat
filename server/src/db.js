import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "..", "data", "data.sqlite"));

db.exec(`
  CREATE TABLE IF NOT EXISTS daily_lessons (
    date TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    lesson_json TEXT NOT NULL,
    PRIMARY KEY (date, topic_id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    country TEXT NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0,
    is_premium INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed some fake competitors so the leaderboard isn't empty on a fresh DB.
const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
if (userCount === 0) {
  const insert = db.prepare(`
    INSERT INTO users (id, name, avatar, country, xp, streak, is_premium)
    VALUES (@id, @name, @avatar, @country, @xp, @streak, @is_premium)
  `);
  const seedUsers = [
    { id: "seed-1", name: "Sofia M.", avatar: "🦋", country: "🇧🇷", xp: 2840, streak: 21, is_premium: 1 },
    { id: "seed-2", name: "Kai T.",   avatar: "⚡", country: "🇯🇵", xp: 2610, streak: 18, is_premium: 1 },
    { id: "seed-3", name: "Priya R.", avatar: "🌸", country: "🇮🇳", xp: 2430, streak: 14, is_premium: 0 },
    { id: "seed-4", name: "Luca B.",  avatar: "🔥", country: "🇮🇹", xp: 1890, streak: 9,  is_premium: 0 },
    { id: "seed-5", name: "Amara K.", avatar: "🌙", country: "🇳🇬", xp: 1740, streak: 7,  is_premium: 1 },
    { id: "seed-6", name: "Ethan W.", avatar: "🚀", country: "🇺🇸", xp: 1320, streak: 5,  is_premium: 0 },
    { id: "seed-7", name: "Hana L.",  avatar: "🌿", country: "🇰🇷", xp: 980,  streak: 3,  is_premium: 0 },
    { id: "seed-8", name: "Omar F.",  avatar: "🎨", country: "🇪🇬", xp: 750,  streak: 2,  is_premium: 0 },
    { id: "seed-9", name: "Zoe P.",   avatar: "💫", country: "🇦🇺", xp: 420,  streak: 1,  is_premium: 0 },
  ];
  for (const u of seedUsers) insert.run(u);
}

export default db;
