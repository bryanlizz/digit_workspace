// ─────────────────────────────────────────────────────────
// 数智企业 · 审计日志 tRPC Router
// ─────────────────────────────────────────────────────────

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { auditRepo } from "~/lib/repository";

const auditFilterSchema = z.object({
  tenantId: z.string().optional(),
  agentId: z.string().optional(),
  employeeId: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const auditRouter = createTRPCRouter({
  /** 获取审计日志列表（支持筛选） */
  list: protectedProcedure
    .input(auditFilterSchema.optional())
    .query(async ({ input }) => {
      return auditRepo.findMany(input);
    }),

  /** 获取最近活动时间线 */
  getRecentActivity: protectedProcedure
    .input(z.object({ limit: z.number().int().default(20) }).optional())
    .query(async ({ input }) => {
      return auditRepo.findMany({ limit: input?.limit });
    }),

  /** 获取任务责任链 */
  getResponsibilityChain: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      return auditRepo.getResponsibilityChain(input.taskId);
    }),

  /** 获取任务回放 */
  getTaskReplay: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      return auditRepo.getTaskReplay(input.taskId);
    }),

  /** 获取审计统计 */
  getStats: protectedProcedure.query(async () => {
    return auditRepo.getStats("tenant-default");
  }),

  /** 导出审计日志为 CSV 字符串 */
  exportCsv: protectedProcedure
    .input(z.object({ limit: z.number().int().default(1000) }).optional())
    .query(async ({ input }) => {
      const logs = await auditRepo.findMany({ limit: input?.limit ?? 1000, tenantId: "tenant-default" });
      const headers = "id,时间,操作,Agent,权限,Hash\n";
      const rows = logs.map((l) =>
        `${l.id},${l.createdAt},${l.action},${l.agentId ?? ""},L${l.permissionLevel},${(l.currentHash ?? "").slice(0, 12)}`
      ).join("\n");
      return headers + rows;
    }),
});
