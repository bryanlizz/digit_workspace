// ─────────────────────────────────────────────────────────
// 数智企业 · 接管后继续执行
// 人类决策后恢复任务状态并继续
// ─────────────────────────────────────────────────────────

import { db } from "~/server/db";
import { taskRepo } from "~/lib/repository";

export interface TakeoverResumeInput {
  taskId: string;
  resumeFromSubTaskId?: string;
  action: "resume" | "skip" | "abort";
  reason?: string;
  humanId: string;
}

export async function resumeAfterTakeover(input: TakeoverResumeInput): Promise<{ success: boolean; newStatus: string }> {
  const task = await taskRepo.findById(input.taskId);
  if (!task) throw new Error(`任务不存在: ${input.taskId}`);
  if (task.status !== "BLOCKED") throw new Error(`任务状态不是 BLOCKED: ${task.status}`);

  switch (input.action) {
    case "resume": {
      // 更新任务状态回 IN_PROGRESS，保留接管记录
      const result = JSON.parse(task.result ?? "{}");
      await taskRepo.update(input.taskId, {
        status: "IN_PROGRESS",
        result: JSON.stringify({
          ...result,
          takeover: {
            action: "resume",
            humanId: input.humanId,
            reason: input.reason,
            resumedAt: new Date().toISOString(),
            resumeFrom: input.resumeFromSubTaskId,
          },
        }),
      });
      return { success: true, newStatus: "IN_PROGRESS" };
    }

    case "skip": {
      // 跳过当前子任务
      const result = JSON.parse(task.result ?? "{}");
      await taskRepo.update(input.taskId, {
        status: "IN_PROGRESS",
        result: JSON.stringify({
          ...result,
          takeover: {
            action: "skip",
            humanId: input.humanId,
            reason: input.reason,
            skippedAt: new Date().toISOString(),
            skippedSubTaskId: input.resumeFromSubTaskId,
          },
        }),
      });
      return { success: true, newStatus: "IN_PROGRESS" };
    }

    case "abort": {
      await taskRepo.update(input.taskId, {
        status: "REJECTED",
        completedAt: new Date().toISOString(),
        result: JSON.stringify({
          error: "人工终止",
          takeover: {
            action: "abort",
            humanId: input.humanId,
            reason: input.reason,
            abortedAt: new Date().toISOString(),
          },
        }),
      });
      return { success: true, newStatus: "REJECTED" };
    }

    default:
      throw new Error(`未知操作: ${input.action}`);
  }
}
