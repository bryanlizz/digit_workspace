// ─────────────────────────────────────────────────────────
// 数智企业 · 任务 tRPC Router
// ─────────────────────────────────────────────────────────

import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { taskRepo } from "~/lib/repository";
import { auditRepo } from "~/lib/repository";
import { agentRuntime } from "~/server/agent/agentRuntime";
import { taskExecutor } from "~/server/engine/taskExecutor";
import { approvalService } from "~/server/engine/approvalService";
import { db } from "~/server/db";

const taskStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "BLOCKED", "AWAITING_APPROVAL", "DONE", "REJECTED"]);
const riskLevelEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const taskRouter = createTRPCRouter({
  /** 获取任务列表（支持筛选） */
  list: publicProcedure
    .input(
      z
        .object({
          status: taskStatusEnum.optional(),
          riskLevel: riskLevelEnum.optional(),
          assigneeId: z.string().optional(),
          projectId: z.string().optional(),
          creatorId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return taskRepo.findMany(input);
    }),

  /** 获取任务详情 */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return taskRepo.findById(input.id);
    }),

  /** 创建任务并自动触发执行引擎 */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "任务标题不能为空").max(200, "标题不能超过200字"),
        description: z.string().max(2000, "描述不能超过2000字").optional(),
        riskLevel: riskLevelEnum.default("LOW"),
        permissionLevel: z.number().int().min(1).max(5).default(1),
        assigneeId: z.string().optional(),
        projectId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tid = ctx.tenantId;
      const task = await taskRepo.create({
        title: input.title,
        description: input.description,
        riskLevel: input.riskLevel,
        permissionLevel: input.permissionLevel,
        assigneeId: input.assigneeId,
        projectId: input.projectId,
      });

      // 记录审计日志
      await auditRepo.log({
        tenantId: tid,
        action: "TASK_CREATED",
        permissionLevel: input.permissionLevel,
        detail: { taskId: task.id, title: input.title, riskLevel: input.riskLevel },
      });

      const agent = input.assigneeId
        ? await db.agent.findUnique({
            where: { id: input.assigneeId },
            include: { owner: true },
          })
        : await db.agent.findFirst({
            where: { tenantId: tid, isActive: true },
            orderBy: { createdAt: "asc" },
            include: { owner: true },
          });

      if (!agent) {
        await taskRepo.update(task.id, {
          status: "REJECTED",
          completedAt: new Date().toISOString(),
          result: JSON.stringify({ error: "没有可执行任务的 Agent" }),
        });
        throw new Error("没有可执行任务的 Agent");
      }

      if (!input.assigneeId) {
        await taskRepo.update(task.id, {
          assignee: {
            id: agent.id,
            name: agent.name,
            avatar: agent.avatar ?? null,
          },
        });
      }

      const result = await taskExecutor.executeTask(task.id, {
        taskId: task.id,
        agentId: agent.id,
        projectId: task.project?.id ?? "default",
        tenantId: task.tenantId,
        supervisorId: agent.owner.id,
        config: {
          maxSteps: 20,
          maxRetries: 1,
          timeout: 60 * 60 * 1000,
          maxLevel: input.permissionLevel,
        },
      });

      return { ...task, executionResult: result };
    }),

  /** 更新任务状态 */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: taskStatusEnum,
        result: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tid = ctx.tenantId;
      const task = await taskRepo.findById(input.id);
      if (!task) throw new Error("任务不存在");

      const updated = await taskRepo.update(input.id, {
        status: input.status,
        result: input.result,
        completedAt: input.status === "DONE" || input.status === "REJECTED" ? new Date().toISOString() : undefined,
      });

      await auditRepo.log({
        tenantId: tid,
        action: `TASK_${input.status}`,
        detail: { taskId: input.id, previousStatus: task.status, newStatus: input.status },
      });

      return updated;
    }),

  /** 获取待审批队列 */
  getApprovalQueue: publicProcedure.query(async () => {
    return approvalService.getPendingApprovals("admin-boss");
  }),

  /** 获取待审批列表 */
  getPendingApprovals: publicProcedure
    .input(z.object({ approverId: z.string().default("admin-boss") }).optional())
    .query(async ({ input }) => {
      return approvalService.getPendingApprovals(input?.approverId ?? "admin-boss");
    }),

  /** 处理审批 */
  processApproval: protectedProcedure
    .input(
      z.object({
        approvalId: z.string(),
        decision: z.enum(["approved", "rejected"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await approvalService.processApproval(input.approvalId, input.decision, input.reason);

      await auditRepo.log({
        tenantId: ctx.tenantId,
        action: input.decision === "approved" ? "APPROVAL_APPROVED" : "APPROVAL_REJECTED",
        permissionLevel: 5,
        detail: { approvalId: input.approvalId, reason: input.reason },
      });

      return { success: true };
    }),

  /** 获取任务审批记录 */
  getApprovalsByTask: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      return approvalService.getApprovalsByTask(input.taskId);
    }),

  /** 审批通过 */
  approve: protectedProcedure
    .input(
      z.object({
        approvalId: z.string(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await approvalService.processApproval(input.approvalId, "approved", input.comment);

      await auditRepo.log({
        tenantId: ctx.tenantId,
        action: "APPROVAL_APPROVED",
        permissionLevel: 5,
        detail: { approvalId: input.approvalId, comment: input.comment },
      });

      return { success: true };
    }),

  /** 审批驳回 */
  reject: protectedProcedure
    .input(
      z.object({
        approvalId: z.string(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await approvalService.processApproval(input.approvalId, "rejected", input.comment);

      await auditRepo.log({
        tenantId: ctx.tenantId,
        action: "APPROVAL_REJECTED",
        permissionLevel: 5,
        detail: { approvalId: input.approvalId, comment: input.comment },
      });

      return { success: true };
    }),

  /** 手动触发 AI 执行 */
  executeWithAI: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input }) => {
      const result = await agentRuntime.runTask(input.taskId);
      return result;
    }),

  /** 获取任务进度 */
  getProgress: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      return taskExecutor.getTaskProgress(input.taskId);
    }),

  /** 取消任务 */
  cancel: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await taskExecutor.cancelTask(input.taskId);

      await auditRepo.log({
        tenantId: ctx.tenantId,
        action: "TASK_CANCELLED",
        detail: { taskId: input.taskId },
      });

      return { success: true };
    }),

  /** 重试任务 */
  retry: protectedProcedure
    .input(z.object({ taskId: z.string(), failedSubTaskIds: z.array(z.string()).optional() }))
    .mutation(async ({ ctx, input }) => {
      const result = await taskExecutor.retryTask(input.taskId, input.failedSubTaskIds);

      await auditRepo.log({
        tenantId: ctx.tenantId,
        action: "TASK_RETRIED",
        detail: { taskId: input.taskId },
      });

      return result;
    }),

  /** 获取任务时间线 */
  getTimeline: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      return taskRepo.getTimeline(input.taskId);
    }),

  /** 按项目获取任务 */
  findByProject: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return taskRepo.findByProject(input.projectId);
    }),
});

