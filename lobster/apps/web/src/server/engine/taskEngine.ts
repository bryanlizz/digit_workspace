// ─────────────────────────────────────────────────────────
// 任务执行引擎
// 保留旧入口，实际执行统一转交给 TaskExecutor
// ─────────────────────────────────────────────────────────

import { taskRepo } from "~/lib/repository";
import { db } from "~/server/db";
import { taskExecutor } from "./taskExecutor";

export interface TaskExecutionResult {
  taskId: string;
  status: "PENDING" | "IN_PROGRESS" | "BLOCKED" | "AWAITING_APPROVAL" | "DONE" | "REJECTED";
  result?: string;
  approvalRequired?: boolean;
  error?: string;
}

/**
 * 任务执行引擎
 * 兼容旧调用点，但不再维护独立生命周期实现
 */
export class TaskEngine {
  async executeTask(taskId: string): Promise<TaskExecutionResult> {
    const task = await taskRepo.findById(taskId);
    if (!task) {
      return { taskId, status: "REJECTED", error: `任务 ${taskId} 不存在` };
    }

    const agent = task.assignee
      ? await db.agent.findUnique({ where: { id: task.assignee.id }, include: { owner: true } })
      : await db.agent.findFirst({
          where: { tenantId: task.tenantId, isActive: true },
          orderBy: { createdAt: "asc" },
          include: { owner: true },
        });

    if (!agent || !agent.owner) {
      return { taskId, status: "REJECTED", error: "没有可执行任务的 Agent" };
    }

    if (!task.assignee) {
      await taskRepo.update(taskId, {
        assignee: {
          id: agent.id,
          name: agent.name,
          avatar: agent.avatar ?? null,
        },
      });
    }

    const result = await taskExecutor.executeTask(taskId, {
      taskId,
      agentId: agent.id,
      projectId: task.project?.id ?? "default",
      tenantId: task.tenantId,
      supervisorId: agent.owner.id,
      config: {
        maxSteps: 20,
        maxRetries: 1,
        timeout: 60 * 60 * 1000,
        maxLevel: task.permissionLevel,
      },
    });

    return {
      taskId: result.taskId,
      status: result.status,
      result: result.summary,
      approvalRequired: result.status === "AWAITING_APPROVAL",
    };
  }
}

export const taskEngine = new TaskEngine();
