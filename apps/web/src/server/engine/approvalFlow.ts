import { taskRepo } from "~/lib/repository";
import { approvalService } from "./approvalService";
import type { TaskExecutionResult } from "./types";

export interface ApprovalRequest {
  taskId: string;
  title: string;
  riskLevel: string;
  permissionLevel: number;
  requestedBy: string;
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

/**
 * 审批流管理
 * 保留旧入口，但审批状态统一走 ApprovalService
 */
export class ApprovalFlow {
  async routeApproval(taskId: string): Promise<string> {
    const task = await taskRepo.findById(taskId);
    if (!task) throw new Error(`任务 ${taskId} 不存在`);

    if (task.riskLevel === "HIGH") {
      return "admin-boss";
    }

    return "admin-boss";
  }

  async processApproval(
    taskId: string,
    approverId: string,
    approved: boolean,
    comment?: string,
  ): Promise<TaskExecutionResult> {
    const approvals = await approvalService.getApprovalsByTask(taskId);
    const approval = [...approvals].reverse().find(
      (item) => item.approverId === approverId && item.status === "pending",
    );

    if (!approval) {
      throw new Error(`任务 ${taskId} 没有待处理的审批记录`);
    }

    await approvalService.processApproval(
      approval.id,
      approved ? "approved" : "rejected",
      comment,
    );

    const updated = await taskRepo.findById(taskId);

    if (approved) {
      return {
        taskId,
        status: "DONE",
        summary: updated?.result ?? "审批通过，任务完成。",
        subTasks: [],
        artifacts: [],
        externalRecords: [],
        errors: [],
        nextActions: [],
        executionTimeMs: 0,
      };
    }

    return {
      taskId,
      status: "REJECTED",
      summary: comment ? `审批被驳回：${comment}` : "审批被驳回。",
      subTasks: [],
      artifacts: [],
      externalRecords: [],
      errors: [],
      nextActions: [],
      executionTimeMs: 0,
    };
  }
}

export const approvalFlow = new ApprovalFlow();

/**
 * 熔断规则配置
 */
export const CIRCUIT_BREAKER_RULES = {
  triggers: {
    maxPermissionLevel: 4,
    riskThreshold: "HIGH" as const,
    crossDepartmentTransfer: true,
    dataExportToExternal: true,
  },
  actions: {
    requireApproval: true,
    notifyAdmin: true,
    logAudit: true,
    pauseAgent: false,
  },
};
