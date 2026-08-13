// ─────────────────────────────────────────────────────────
// 数智企业 · Stripe Webhook Handler
// POST /api/billing/webhook
// ─────────────────────────────────────────────────────────

import type { NextApiRequest, NextApiResponse } from "next";
import { billingService } from "~/server/billing/billingService";

// 禁用 bodyParser — Stripe 需要原始 body 做签名验证
export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = "";
  for await (const chunk of req) {
    body += chunk.toString();
  }

  const signature = req.headers["stripe-signature"] as string;
  if (!signature) return res.status(400).json({ error: "Missing stripe-signature header" });

  const result = await billingService.handleStripeWebhook(body, signature);

  if (result.received) {
    res.status(200).json({ received: true, type: result.type });
  } else {
    res.status(400).json({ error: result.error ?? "Webhook processing failed" });
  }
}
