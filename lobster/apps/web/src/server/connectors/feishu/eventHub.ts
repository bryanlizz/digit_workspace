// ─────────────────────────────────────────────────────────
// 数智企业 · 飞书事件订阅客户端
// 管理飞书 Event Hub 订阅，接收审批/消息等事件
// ─────────────────────────────────────────────────────────

import { env } from "~/env";

const FEISHU_BASE = "https://open.feishu.cn/open-apis";

interface EventSubscription {
  eventType: string;
  callback: (event: Record<string, unknown>) => Promise<void>;
}

export class FeishuEventHub {
  private subscriptions: EventSubscription[] = [];

  /**
   * 订阅事件类型
   */
  subscribe(eventType: string, callback: (event: Record<string, unknown>) => Promise<void>): void {
    this.subscriptions.push({ eventType, callback });
    console.log(`[FeishuEventHub] Subscribed to: ${eventType}`);
  }

  /**
   * 处理来自 Webhook 的事件
   */
  async handleEvent(eventType: string, event: Record<string, unknown>): Promise<void> {
    const subs = this.subscriptions.filter((s) => s.eventType === eventType);
    for (const sub of subs) {
      try {
        await sub.callback(event);
      } catch (error) {
        console.error(`[FeishuEventHub] Error handling ${eventType}:`, error);
      }
    }
  }

  /**
   * 获取租户访问 Token
   */
  async getTenantAccessToken(): Promise<string | null> {
    const appId = env.FEISHU_APP_ID;
    const appSecret = env.FEISHU_APP_SECRET;
    if (!appId || !appSecret) return null;

    try {
      const resp = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
      });
      const data = await resp.json() as Record<string, unknown>;
      return (data.tenant_access_token as string) ?? null;
    } catch {
      return null;
    }
  }
}

export const feishuEventHub = new FeishuEventHub();
