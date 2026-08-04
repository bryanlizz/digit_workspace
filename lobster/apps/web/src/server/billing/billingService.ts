// ─────────────────────────────────────────────────────────
// 数智企业 · Billing Service
// ─────────────────────────────────────────────────────────

import { db } from "~/server/db";

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
}

export const billingService = new BillingService();
