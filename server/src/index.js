import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import lessonsRouter from "./routes/lessons.js";
import leaderboardRouter from "./routes/leaderboard.js";
import paymentsRouter, { stripeWebhook } from "./routes/payments.js";

dotenv.config();

const app = express();

// Stripe webhook needs the raw body for signature verification, so it must
// be registered before express.json().
app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api", lessonsRouter);
app.use("/api", leaderboardRouter);
app.use("/api", paymentsRouter);

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`Curiosity backend listening on http://localhost:${PORT}`);
});
