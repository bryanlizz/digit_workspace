// ─────────────────────────────────────────────────────────
// 数智企业 · 通知渠道
// 多渠道通知抽象：邮件、飞书 Webhook、自定义 Webhook
// ─────────────────────────────────────────────────────────

import { createTransport, type Transporter } from "nodemailer";
import { env } from "~/env";

export interface NotificationPayload {
  title: string;
  message: string;
  category: string;
  recipientName: string;
  recipientEmail?: string | null;
  metadata?: Record<string, unknown>;
}

export interface NotificationChannel {
  readonly name: string;
  send(payload: NotificationPayload): Promise<boolean>;
}

// ─── 邮件渠道 ──────────────────────────────────────────

export class EmailChannel implements NotificationChannel {
  readonly name = "email";
  private transporter: Transporter | null = null;

  constructor() {
    if (env.SMTP_HOST) {
      this.transporter = createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: env.SMTP_SECURE ?? false,
        auth: {
          user: env.SMTP_USER ?? "",
          pass: env.SMTP_PASS ?? "",
        },
      });
    }
  }

  async send(payload: NotificationPayload): Promise<boolean> {
    if (!this.transporter || !payload.recipientEmail) {
      console.log(`[EmailChannel] Skip: ${payload.title} (no transport or recipient email)`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: env.SMTP_FROM ?? "lobster@example.com",
        to: payload.recipientEmail,
        subject: `[数智企业] ${payload.title}`,
        text: payload.message,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1a3856">🦞 数智企业</h2>
          <h3>${payload.title}</h3>
          <p>${payload.message}</p>
          <hr style="border-color:#e5e7eb">
          <p style="color:#9ca3af;font-size:12px">${payload.category} · 系统自动发送</p>
        </div>`,
      });
      console.log(`[EmailChannel] Sent to ${payload.recipientEmail}: ${payload.title}`);
      return true;
    } catch (error) {
      console.error(`[EmailChannel] Failed to send to ${payload.recipientEmail}:`, error);
      return false;
    }
  }
}

// ─── 飞书 Webhook 渠道 ────────────────────────────────

export class FeishuChannel implements NotificationChannel {
  readonly name = "feishu";

  async send(payload: NotificationPayload): Promise<boolean> {
    const webhookUrl = env.FEISHU_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log(`[FeishuChannel] Skip: FEISHU_WEBHOOK_URL not configured`);
      return false;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msg_type: "interactive",
          card: {
            header: {
              title: { tag: "plain_text", content: `🦞 ${payload.title}` },
              template: "blue",
            },
            elements: [
              { tag: "div", text: { tag: "lark_md", content: payload.message } },
              {
                tag: "note",
                elements: [
                  { tag: "plain_text", content: `${payload.category} · 收件人: ${payload.recipientName}` },
                ],
              },
            ],
          },
        }),
      });

      const ok = response.ok;
      if (ok) {
        console.log(`[FeishuChannel] Sent to ${payload.recipientName}: ${payload.title}`);
      }
      return ok;
    } catch (error) {
      console.error(`[FeishuChannel] Failed:`, error);
      return false;
    }
  }
}

// ─── 自定义 Webhook 渠道 ──────────────────────────────

export class WebhookChannel implements NotificationChannel {
  readonly name = "webhook";

  async send(payload: NotificationPayload): Promise<boolean> {
    const webhookUrl = env.NOTIFY_WEBHOOK_URL;
    if (!webhookUrl) return false;

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          message: payload.message,
          category: payload.category,
          recipient: payload.recipientName,
          email: payload.recipientEmail,
          metadata: payload.metadata,
          timestamp: new Date().toISOString(),
        }),
      });
      return true;
    } catch {
      return false;
    }
  }
}

// ─── 渠道管理器 ───────────────────────────────────────

export class ChannelManager {
  private channels: NotificationChannel[] = [];

  constructor() {
    this.channels.push(new EmailChannel());
    this.channels.push(new FeishuChannel());
    this.channels.push(new WebhookChannel());
  }

  async broadcast(payload: NotificationPayload): Promise<void> {
    const results = await Promise.allSettled(
      this.channels.map((ch) => ch.send(payload)),
    );

    for (let i = 0; i < this.channels.length; i++) {
      const result = results[i];
      if (result?.status === "rejected") {
        console.warn(`[ChannelManager] ${this.channels[i]?.name} failed:`, result.reason);
      }
    }
  }
}

export const channelManager = new ChannelManager();
