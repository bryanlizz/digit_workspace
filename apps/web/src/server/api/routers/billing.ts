// ─────────────────────────────────────────────────────────
// 数智企业 · 计费 tRPC Router
// ─────────────────────────────────────────────────────────

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { billingService } from "~/server/billing/billingService";

export const billingRouter = createTRPCRouter({
  /** 获取所有套餐 */
  getPlans: protectedProcedure.query(async () => {
    return billingService.getAllPlans();
  }),

  /** 获取租户当前套餐和用量 */
  getTenantUsage: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId ?? "tenant-default";
    const [plan, usage, estimate] = await Promise.all([
      billingService.getTenantPlan(tenantId),
      billingService.getTenantUsage(tenantId),
      billingService.getCurrentInvoiceEstimate(tenantId),
    ]);
    return { plan, usage, estimate };
  }),

  /** 检查租户是否超出限额 */
  checkLimits: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId ?? "tenant-default";
    return billingService.checkTenantLimits(tenantId);
  }),

  /** 创建 Stripe Checkout Session */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        planId: z.enum(["pro", "enterprise"]),
        seats: z.number().int().min(1).max(1000),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId ?? "tenant-default";
      return billingService.createStripeCheckout({
        tenantId,
        planId: input.planId,
        seats: input.seats,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });
    }),

  /** 获取 Stripe 订阅状态 */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId ?? "tenant-default";
    return billingService.getStripeSubscription(tenantId);
  }),

  /** 取消订阅 */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.tenantId ?? "tenant-default";
    return billingService.cancelStripeSubscription(tenantId);
  }),
});
