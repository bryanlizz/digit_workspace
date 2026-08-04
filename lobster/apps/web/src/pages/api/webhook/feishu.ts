// ─────────────────────────────────────────────────────────
// 数智企业 · 飞书 Webhook 回调端点
// POST /api/webhook/feishu — 接收飞书事件回调
// ─────────────────────────────────────────────────────────

import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "~/env";

/**
 * 验证飞书 Webhook 签名
 */
function verifySignature(body: string, timestamp: string, nonce: string, signature: string): boolean {
  if (!env.FEISHU_APP_SECRET) return false;

  const crypto = require("crypto") as typeof import("crypto");
  const parts = [timestamp, nonce, env.FEISHU_APP_SECRET, body].sort().join("");
  const computed = crypto.createHash("sha256").update(parts).digest("hex");
  return computed === signature;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // URL verification (飞书首次配置 webhook 时)
  const challenge = req.body?.challenge;
  if (challenge) {
    return res.status(200).json({ challenge });
  }

  // Verify signature
  const timestamp = req.headers["x-lark-request-timestamp"] as string;
  const nonce = req.headers["x-lark-request-nonce"] as string;
  const signature = req.headers["x-lark-signature"] as string;
  const body = JSON.stringify(req.body);

  if (timestamp && nonce && signature) {
    if (!verifySignature(body, timestamp, nonce, signature)) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  // Process event
  const event = req.body?.event;
  const eventType = req.body?.header?.event_type as string;

  console.log(`[Feishu Webhook] Received event: ${eventType}`, event);

  switch (eventType) {
    case "im.message.receive_v1":
      // Handle incoming message
      console.log("[Feishu Webhook] Message received:", event?.message?.content);
      break;
    case "approval_instance.approve":
    case "approval_instance.reject":
      // Handle approval callback
      console.log("[Feishu Webhook] Approval event:", eventType);
      break;
    default:
      console.log(`[Feishu Webhook] Unhandled event type: ${eventType}`);
  }

  res.status(200).json({ code: 0, msg: "ok" });
}
