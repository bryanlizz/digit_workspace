// ─────────────────────────────────────────────────────────
// 数智企业 · Billing Service
// ─────────────────────────────────────────────────────────

import { db } from "~/server/db";
import Stripe from "stripe";
import { env } from "~/env";

let stripe: Stripe | null = null;

function getStripeClient(): Stripe | null {
  if (stripe) return stripe;
  if (env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-06-30.basil" as any });
  }
  return stripe;
}

const STRIPE_PRICE_IDS: Record<string, string> = {
  pro: env.STRIPE_PRICE_PRO ?? "",
  enterprise: env.STRIPE_PRICE_ENTERPRISE ?? "",
};

export interface SubscriptionPlan {
  id: string;
  name: string;
  seatPrice: number;
  agentPrice: number;
  maxSeats: number;
  maxAgents: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  date: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  total: number;
  status: "paid" | "pending" | "overdue";
}

const PLANS: Record<string, SubscriptionPlan> = {
  free: { id: "free", name: "Free", seatPrice: 0, agentPrice: 0, maxSeats: 1, maxAgents: 3 },
  pro: { id: "pro", name: "Pro", seatPrice: 199, agentPrice: 99, maxSeats: 10, maxAgents: 30 },
  enterprise: { id: "enterprise", name: "Enterprise", seatPrice: 999, agentPrice: 299, maxSeats: 100, maxAgents: 500 },
};

function resolvePlanId(planId?: string | null): keyof typeof PLANS {
  return planId && planId in PLANS ? (planId as keyof typeof PLANS) : "free";
}

export class BillingService {
  getPlan(planId: string): SubscriptionPlan {
    return PLANS[resolvePlanId(planId)]!;
  }

  async getTenantPlan(tenantId: string): Promise<SubscriptionPlan> {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { tier: true },
    });

    return this.getPlan(tenant?.tier ?? "free");
  }

  getAllPlans(): SubscriptionPlan[] {
    return Object.values(PLANS);
  }

  calculateCost(planId: string, seats: number, agents: number): number {
    const plan = this.getPlan(planId);
    return seats * plan.seatPrice + agents * plan.agentPrice;
  }

  checkLimits(planId: string, seats: number, agents: number): { allowed: boolean; reason?: string } {
    const plan = this.getPlan(planId);
    if (seats > plan.maxSeats) return { allowed: false, reason: `${plan.name} 方案最多 ${plan.maxSeats} 个席位` };
    if (agents > plan.maxAgents) return { allowed: false, reason: `${plan.name} 方案最多 ${plan.maxAgents} 个 Agent` };
    return { allowed: true };
  }

  async getTenantUsage(tenantId: string): Promise<{ seats: number; agents: number }> {
    const [seats, agents] = await Promise.all([
      db.employee.count({ where: { tenantId, isActive: true } }),
      db.agent.count({ where: { tenantId, isActive: true } }),
    ]);

    return { seats, agents };
  }

  async checkTenantLimits(tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
    const [plan, usage] = await Promise.all([this.getTenantPlan(tenantId), this.getTenantUsage(tenantId)]);
    return this.checkLimits(plan.id, usage.seats, usage.agents);
  }

  async getCurrentInvoiceEstimate(tenantId: string): Promise<Invoice | null> {
    const [plan, usage] = await Promise.all([this.getTenantPlan(tenantId), this.getTenantUsage(tenantId)]);
    const total = this.calculateCost(plan.id, usage.seats, usage.agents);

    if (usage.seats === 0 && usage.agents === 0 && total === 0) {
      return null;
    }

    return {
      id: `estimate-${tenantId}`,
      tenantId,
      date: new Date().toISOString().slice(0, 7),
      items: [
        { description: `${plan.name} 方案员工席位`, quantity: usage.seats, unitPrice: plan.seatPrice, total: usage.seats * plan.seatPrice },
        { description: `${plan.name} 方案 Agent 执行单元`, quantity: usage.agents, unitPrice: plan.agentPrice, total: usage.agents * plan.agentPrice },
      ],
      total,
      status: "pending",
    };
  }

  async generateMockInvoices(tenantId: string): Promise<Invoice[]> {
    const estimate = await this.getCurrentInvoiceEstimate(tenantId);
    return estimate ? [estimate] : [];
  }

  // ── Stripe 集成 ──

  /** 创建 Stripe Checkout Session */
  async createStripeCheckout(params: {
    tenantId: string;
    planId: "pro" | "enterprise";
    seats: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string } | { error: string }> {
    const s = getStripeClient();
    if (!s) return { error: "Stripe 未配置（缺少 STRIPE_SECRET_KEY）" };

    try {
      const plan = this.getPlan(params.planId);
      const priceId = STRIPE_PRICE_IDS[params.planId];
      const lineItem: any = priceId
        ? { price: priceId, quantity: params.seats }
        : {
            price_data: {
              currency: "cny",
              product_data: { name: `${plan.name} 套餐` },
              recurring: { interval: "month" as const },
              unit_amount: plan.seatPrice * 100, // 元 → 分
            },
            quantity: params.seats,
          };

      const session = await s.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [lineItem],
        metadata: {
          tenantId: params.tenantId,
          planId: params.planId,
          seats: String(params.seats),
        },
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      });

      return { url: session.url ?? "" };
    } catch (error) {
      console.error("[Billing] Checkout 创建失败:", error);
      return { error: error instanceof Error ? error.message : "创建支付会话失败" };
    }
  }

  /** 获取 Stripe 订阅状态 */
  async getStripeSubscription(tenantId: string): Promise<{
    plan: string; status: string; seats: number; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean;
  } | null> {
    const s = getStripeClient();
    if (!s) return null;

    try {
      const subs = await s.subscriptions.search({
        query: `metadata["tenantId"]:"${tenantId}"`,
        limit: 1,
      });
      const sub = subs.data[0];
      if (!sub) return null;

      return {
        plan: (sub.metadata.planId as string) ?? "free",
        status: sub.status,
        seats: parseInt(sub.metadata.seats as string ?? "1", 10),
        currentPeriodEnd: (sub as any).current_period_end
          ? new Date((sub as any).current_period_end * 1000).toISOString()
          : null,
        cancelAtPeriodEnd: (sub as any).cancel_at_period_end ?? false,
      };
    } catch (error) {
      console.error("[Billing] 查询 Stripe 订阅失败:", error);
      return null;
    }
  }

  /** 取消 Stripe 订阅 */
  async cancelStripeSubscription(tenantId: string): Promise<boolean> {
    const s = getStripeClient();
    if (!s) return false;

    try {
      const subs = await s.subscriptions.search({
        query: `metadata["tenantId"]:"${tenantId}"`,
        limit: 1,
      });
      const sub = subs.data[0];
      if (!sub) return false;

      await s.subscriptions.update(sub.id, { cancel_at_period_end: true });
      return true;
    } catch (error) {
      console.error("[Billing] 取消 Stripe 订阅失败:", error);
      return false;
    }
  }

  /** 处理 Stripe Webhook */
  async handleStripeWebhook(body: string, signature: string): Promise<{ received: boolean; type?: string; error?: string }> {
    const s = getStripeClient();
    const secret = env.STRIPE_WEBHOOK_SECRET;
    if (!s || !secret) return { received: false, error: "Stripe Webhook 未配置" };

    try {
      const event = s.webhooks.constructEvent(body, signature, secret);
      console.log(`[Billing] Webhook 事件: ${event.type}`);

      // 可根据事件类型更新 DB 中的租户订阅状态
      switch (event.type) {
        case "checkout.session.completed":
          // 支付成功 → 激活订阅
          break;
        case "customer.subscription.deleted":
          // 订阅取消
          break;
      }

      return { received: true, type: event.type };
    } catch (error) {
      console.error("[Billing] Webhook 签名验证失败:", error);
      return { received: false, error: "签名验证失败" };
    }
  }
}

export const billingService = new BillingService();
