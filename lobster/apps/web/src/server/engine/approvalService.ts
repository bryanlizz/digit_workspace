// ─────────────────────────────────────────────────────────
// 审批服务
// 创建、查询、处理审批请求
// ─────────────────────────────────────────────────────────

import { randomUUID } from "crypto";
import type {
  Approval,
  ApprovalDetails,
  ApprovalRequest,
  ApprovalStatus,
  SubTask,
  Approver,
  TaskContext,
} from "./types";
import { db as prisma } from "~/server/db";
import { notificationService } from "./notificationService";
import { taskRepo } from "~/lib/repository";

type ApprovalRow = Awaited<ReturnType<typeof prisma.approval.findMany>>[number];

interface ApprovalContextInfo {
  requesterId: string;
  requesterName: string;
  requesterEmail?: string | null;
  approverId: string;
  approverName: string;
  approverEmail?: string | null;
  agentName: string;
  projectName: string;
  taskTitle: string;
  tenantId: string;
}

/**
 * 审批服务
 */
export class ApprovalService {
  /**
   * 创建审批请求
   */
  async createApproval(request: ApprovalRequest): Promise<Approval> {
    const now = new Date();
    const timeout = request.timeout ?? 3600; // 默认 1 小时
    const expiresAt = new Date(now.getTime() + timeout * 1000);
    const contextInfo = await this.resolveApprovalContext(request);

    // 构建审批详情
    const details: ApprovalDetails = {
      action: request.subTask.description,
      tool: request.subTask.toolId ?? "unknown",
      parameters: this.extractParameters(request.subTask),
      risk: this.assessRisk(request.subTask),
      preview: this.generatePreview(request.subTask),
      context: {
        agentName: contextInfo.agentName,
        projectName: contextInfo.projectName,
        requesterName: contextInfo.requesterName,
        approverName: contextInfo.approverName,
        taskTitle: contextInfo.taskTitle,
        tenantId: contextInfo.tenantId,
      },
    };

    // 创建审批记录
    const approval = await prisma.approval.create({
      data: {
        id: randomUUID(),
        taskId: request.taskId,
        subTaskId: request.subTask.id,
        requesterId: contextInfo.requesterId,
        approverId: contextInfo.approverId,
        status: "PENDING",
        details: JSON.stringify(details),
        urgency: request.urgency,
        expiresAt,
        createdAt: now,
      },
    });

    await notificationService.notifyApproval({
      type: "approval_requested",
      approvalId: approval.id,
      taskId: request.taskId,
      tenantId: contextInfo.tenantId,
      title: `待审批：${contextInfo.taskTitle}`,
      recipient: {
        id: contextInfo.approverId,
        name: contextInfo.approverName,
        email: contextInfo.approverEmail,
      },
      message: [
        `Agent「${contextInfo.agentName}」请求执行动作：${request.subTask.description}`,
        `工具：${request.subTask.toolId ?? "未指定"}`,
        `风险：${details.risk}`,
        `紧急程度：${request.urgency}`,
        `过期时间：${expiresAt.toISOString()}`,
      ].join("\n"),
    });

    return this.mapToApproval(approval, details);
  }

  /**
   * 查询审批
   */
  async getApproval(approvalId: string): Promise<Approval | null> {
    const record = await prisma.approval.findUnique({
      where: { id: approvalId },
    });

    if (!record) {
      return null;
    }

    return this.mapToApproval(record, JSON.parse(record.details as string));
  }

  /**
   * 处理审批
   */
  async processApproval(
    approvalId: string,
    decision: "approved" | "rejected",
    reason?: string
  ): Promise<void> {
    const now = new Date();

    const approval = await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: decision === "approved" ? "APPROVED" : "REJECTED",
        decision,
        reason,
        decidedAt: now,
      },
    });

    const task = await prisma.task.findUnique({
      where: { id: approval.taskId },
      select: { tenantId: true },
    });

    await this.notifyRequesterOfDecision(
      {
        ...approval,
        tenantId: task?.tenantId ?? "system",
      },
      decision,
      reason
    );
  }

  /**
   * 获取待审批列表
   */
  async getPendingApprovals(approverId: string): Promise<Approval[]> {
    const records = await prisma.approval.findMany({
      where: {
        approverId,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      records.map((r: ApprovalRow) =>
        this.mapToApproval(r, JSON.parse(r.details as string))
      )
    );
  }

  /**
   * 获取任务的所有审批
   */
  async getApprovalsByTask(taskId: string): Promise<Approval[]> {
    const records = await prisma.approval.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    });

    return Promise.all(
      records.map((r: ApprovalRow) =>
        this.mapToApproval(r, JSON.parse(r.details as string))
      )
    );
  }

  /**
   * 取消审批
   */
  async cancelApproval(approvalId: string): Promise<void> {
    await prisma.approval.update({
      where: { id: approvalId },
      data: { status: "CANCELLED" },
    });
  }

  /**
   * 标记过期审批
   */
  async expireApprovals(): Promise<number> {
    const result = await prisma.approval.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    return result.count;
  }

  /**
   * 获取审批统计
   */
  async getStats(approverId?: string): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
  }> {
    const where = approverId ? { approverId } : {};

    const [pending, approved, rejected, expired] = await Promise.all([
      prisma.approval.count({ where: { ...where, status: "PENDING" } }),
      prisma.approval.count({ where: { ...where, status: "APPROVED" } }),
      prisma.approval.count({ where: { ...where, status: "REJECTED" } }),
      prisma.approval.count({ where: { ...where, status: "EXPIRED" } }),
    ]);

    return { pending, approved, rejected, expired };
  }

  private async resolveApprovalContext(request: ApprovalRequest): Promise<ApprovalContextInfo> {
    const [task, agent, project] = await Promise.all([
      taskRepo.findById(request.taskId),
      prisma.agent.findUnique({
        where: { id: request.context.agentId },
        include: { owner: true },
      }),
      request.context.projectId
        ? prisma.project.findUnique({ where: { id: request.context.projectId } })
        : Promise.resolve(null),
    ]);

    const approverId = await this.resolveApproverId(request.approver, request.context);
    const approver = await prisma.employee.findUnique({ where: { id: approverId } });
    const requesterId = request.context.agentId;

    return {
      requesterId,
      requesterName: agent?.name ?? task?.creator.name ?? requesterId,
      requesterEmail: undefined,
      approverId,
      approverName: approver?.name ?? approverId,
      approverEmail: approver?.email,
      agentName: agent?.name ?? request.context.agentId,
      projectName: project?.name ?? task?.project?.name ?? request.context.projectId,
      taskTitle: task?.title ?? request.taskId,
      tenantId: request.context.tenantId,
    };
  }

  /**
   * 从审批人对象解析审批人 ID
   */
  private async resolveApproverId(approver: Approver, context: TaskContext): Promise<string> {
    if (approver.id) {
      return approver.id;
    }

    if (approver.type === "role" && approver.role) {
      const employee = await prisma.employee.findFirst({
        where: {
          tenantId: context.tenantId,
          role: approver.role,
          isActive: true,
        },
        orderBy: { createdAt: "asc" },
      });
      if (employee) return employee.id;
    }

    return context.supervisorId;
  }

  private async notifyRequesterOfDecision(
    approval: {
      id: string;
      taskId: string;
      requesterId: string;
      approverId: string;
      details: string;
      tenantId: string;
    },
    decision: "approved" | "rejected",
    reason?: string
  ): Promise<void> {
    const [agent, requesterEmployee, approver, task] = await Promise.all([
      prisma.agent.findUnique({
        where: { id: approval.requesterId },
        include: { owner: true },
      }),
      prisma.employee.findUnique({ where: { id: approval.requesterId } }),
      prisma.employee.findUnique({ where: { id: approval.approverId } }),
      prisma.task.findUnique({ where: { id: approval.taskId } }),
    ]);
    const details = JSON.parse(approval.details) as ApprovalDetails;
    const recipient = agent?.owner ?? requesterEmployee;

    await notificationService.notifyApproval({
      type: "approval_decided",
      approvalId: approval.id,
      taskId: approval.taskId,
      tenantId: task?.tenantId ?? details.context?.tenantId?.toString?.() ?? "system",
      title: `审批${decision === "approved" ? "通过" : "驳回"}：${task?.title ?? approval.taskId}`,
      recipient: {
        id: recipient?.id ?? approval.requesterId,
        name: (details.context?.requesterName as string | undefined) ?? recipient?.name ?? approval.requesterId,
        email: recipient?.email,
      },
      message: [
        `动作：${details.action}`,
        `结果：${decision === "approved" ? "通过" : "驳回"}`,
        `审批人：${approver?.name ?? approval.approverId}`,
        reason ? `原因：${reason}` : undefined,
      ].filter(Boolean).join("\n"),
    });
  }

  /**
   * 从子任务提取参数
   */
  private extractParameters(subTask: SubTask): Record<string, unknown> {
    // 从元数据中提取参数
    const params = subTask.metadata?.parameters as Record<string, unknown> | undefined;
    return params ?? {};
  }

  /**
   * 评估风险等级
   */
  private assessRisk(subTask: SubTask): string {
    const highRiskKeywords = [
      "删除",
      "取消",
      "退款",
      "作废",
      "解约",
      "delete",
      "cancel",
      "refund",
    ];
    const mediumRiskKeywords = [
      "发送",
      "修改",
      "更新",
      "send",
      "update",
      "modify",
    ];

    const desc = subTask.description.toLowerCase();

    if (highRiskKeywords.some((kw) => desc.includes(kw))) {
      return "high";
    }

    if (mediumRiskKeywords.some((kw) => desc.includes(kw))) {
      return "medium";
    }

    return "low";
  }

  /**
   * 生成操作预览
   */
  private generatePreview(subTask: SubTask): unknown {
    return {
      description: subTask.description,
      toolId: subTask.toolId,
      level: subTask.estimatedLevel,
      metadata: subTask.metadata,
    };
  }

  /**
   * 将数据库记录映射为 Approval 对象
   */
  private mapToApproval(
    record: {
      id: string;
      taskId: string;
      subTaskId: string | null;
      requesterId: string;
      approverId: string;
      status: string;
      details: string | ApprovalDetails;
      createdAt: Date;
      expiresAt: Date;
      decidedAt?: Date | null;
      decision?: string | null;
      reason?: string | null;
      urgency?: string | null;
    },
    details: ApprovalDetails
  ): Approval {
    const statusMap: Record<string, ApprovalStatus> = {
      PENDING: "pending",
      APPROVED: "approved",
      REJECTED: "rejected",
      EXPIRED: "expired",
      CANCELLED: "cancelled",
    };

    return {
      id: record.id,
      taskId: record.taskId,
      subTaskId: record.subTaskId,
      requesterId: record.requesterId,
      approverId: record.approverId,
      status: statusMap[record.status] ?? "pending",
      details,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      decidedAt: record.decidedAt ?? undefined,
      decision: record.decision as "approved" | "rejected" | undefined,
      reason: record.reason ?? undefined,
    };
  }
}

/**
 * 全局审批服务实例
 */
export const approvalService = new ApprovalService();
