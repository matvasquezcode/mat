import express from "express";
import Stripe from "stripe";
import db from "../db.js";

const router = express.Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// POST /api/create-checkout-session
// body: { yearly: boolean }
// Returns { url } to redirect the browser to Stripe Checkout.
// Requires STRIPE_SECRET_KEY + STRIPE_PRICE_MONTHLY/STRIPE_PRICE_YEARLY in .env.
router.post("/create-checkout-session", async (req, res) => {
  if (!stripe) {
    return res.status(501).json({ error: "Stripe is not configured on the server (set STRIPE_SECRET_KEY)" });
  }

  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(400).json({ error: "x-user-id header is required" });

  const { yearly } = req.body || {};
  const priceId = yearly ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY;
  if (!priceId) {
    return res.status(501).json({ error: "Stripe price IDs are not configured (set STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY)" });
  }

  const appUrl = process.env.APP_URL || "http://localhost:5173";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      success_url: `${appUrl}/?premium=success`,
      cancel_url: `${appUrl}/?premium=cancel`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session failed:", err.message);
    res.status(502).json({ error: "failed to create checkout session" });
  }
});

// POST /api/stripe-webhook
// Marks a user premium once their subscription checkout completes.
// Must be mounted with express.raw() BEFORE express.json() — see index.js.
export function stripeWebhook(req, res) {
  if (!stripe) return res.status(501).end();

  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.client_reference_id;
    if (userId) {
      db.prepare("UPDATE users SET is_premium = 1, updated_at = datetime('now') WHERE id = ?").run(userId);
    }
  }

  res.json({ received: true });
}

export default router;
