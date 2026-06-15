# Curiosity backend

Express + SQLite API for the Curiosity prototype (`curiosity_app.jsx`).

## Setup

```bash
cd server
npm install
cp .env.example .env   # then fill in ANTHROPIC_API_KEY (and Stripe vars if desired)
npm run dev
```

Server runs on `http://localhost:8787` by default. The frontend expects
`/api/*` to be reachable from wherever it's served (proxy or same origin).

## Endpoints

- `POST /api/generate-lesson` `{ topic, topicId?, hint? }` — generates a lesson
  via Claude. When `topicId` is set and `hint` is empty (one of the day's 3
  free lessons), the result is cached per-day in SQLite so every visitor
  shares the same generation instead of triggering their own API call.
  Falls back to `502` if `ANTHROPIC_API_KEY` is missing/invalid — the
  frontend shows mock content in that case.

- `GET /api/leaderboard` — top users by XP.
- `POST /api/leaderboard/me` (header `x-user-id`) — upserts the current
  user's XP/streak/premium status.

- `POST /api/create-checkout-session` (header `x-user-id`) — creates a Stripe
  Checkout session for Premium. Returns `501` until `STRIPE_SECRET_KEY` and
  `STRIPE_PRICE_MONTHLY`/`STRIPE_PRICE_YEARLY` are set in `.env`.
- `POST /api/stripe-webhook` — marks a user premium on
  `checkout.session.completed`. Requires `STRIPE_WEBHOOK_SECRET`.

Data is stored in `server/data/data.sqlite` (gitignored, created on first run).
