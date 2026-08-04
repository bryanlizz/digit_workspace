// ─────────────────────────────────────────────────────────
// 数智企业 · Mock 审计日志仓库
// ─────────────────────────────────────────────────────────

import { createHash, randomUUID } from "crypto";
import { db } from "~/server/db";
import type {
  AuditFilter,
  AuditLogDTO,
  AuditStats,
  CreateAuditLogInput,
  ResponsibilityChainNode,
  TaskReplayDTO,
  TaskDTO,
} from "@lobster/types";
import type { IAuditRepository } from "../types";
import { DEFAULT_TENANT_ID } from "../../data";

const NOW = Date.now();

type SeedLog = Omit<AuditLogDTO, "previousHash" | "currentHash">;

export class MockAuditRepository implements IAuditRepository {
  private logs: AuditLogDTO[];

  constructor() {
    this.logs = this.buildSeedLogs();
  }

  private buildSeedLogs(): AuditLogDTO[] {
    const seeds: SeedLog[] = [
      {
        id: "log-001",
        tenantId: DEFAULT_TENANT_ID,
        agentId: "agent-market-analyst",
        employeeId: null,
        action: "TASK_STARTED",
        permissionLevel: 1,
        detail: { taskId: "task-001", title: "2026Q3 市场趋势分析报告" },
        ipAddress: null,
        createdAt: new Date(NOW - 3600000 * 2).toISOString(),
      },
      {
        id: "log-002",
        tenantId: DEFAULT_TENANT_ID,
        agentId: "agent-competitive-intel",
        employeeId: null,
        action: "TASK_COMPLETED",
        permissionLevel: 1,
        detail: { taskId: "task-002", title: "竞品定价策略调研" },
        ipAddress: null,
        createdAt: new Date(NOW - 3600000).toISOString(),
      },
      {
        id: "log-003",
        tenantId: DEFAULT_TENANT_ID,
        agentId: "agent-financial-analyst",
        employeeId: null,
        action: "PERMISSION_REQUESTED",
        permissionLevel: 4,
        detail: { taskId: "task-003", requiredLevel: 4 },
        ipAddress: null,
        createdAt: new Date(NOW - 1800000).toISOString(),
      },
      {
        id: "log-004",
        tenantId: DEFAULT_TENANT_ID,
        agentId: null,
        employeeId: "admin-boss",
        action: "TASK_APPROVED",
        permissionLevel: 5,
        detail: { taskId: "task-003" },
        ipAddress: null,
        createdAt: new Date(NOW - 900000).toISOString(),
      },
      {
        id: "log-005",
        tenantId: DEFAULT_TENANT_ID,
        agentId: "agent-market-analyst",
        employeeId: null,
        action: "KNOWLEDGE_ACCESSED",
        permissionLevel: 1,
        detail: { taskId: "task-001", docId: "doc-001", title: "行业分析报告" },
        ipAddress: null,
        createdAt: new Date(NOW - 600000).toISOString(),
      },
      {
        id: "log-006",
        tenantId: DEFAULT_TENANT_ID,
        agentId: "agent-ops-executor",
        employeeId: null,
        action: "TOOL_EXECUTED",
        permissionLevel: 3,
        detail: {
          taskId: "task-004",
          toolId: "tool.browser.screenshot",
          toolName: "页面截图",
          systemType: "browser",
          params: { url: "https://example.com", token: "***REDACTED***" },
          result: {
            success: true,
            externalRecordId: "ext-001",
            executionTimeMs: 1530,
            artifacts: [{ name: "screenshot.png", type: "image/png" }],
            externalRecords: [{ system: "browser", id: "ext-001", type: "screenshot" }],
            screenshots: [{ name: "homepage" }],
          },
        },
        ipAddress: null,
        createdAt: new Date(NOW - 300000).toISOString(),
      },
    ];

    const logs: AuditLogDTO[] = [];
    let previousHash: string | null = null;

    for (const seed of seeds) {
      const currentHash = this.hashEntry({ ...seed, previousHash });
      logs.push({ ...seed, previousHash, currentHash });
      previousHash = currentHash;
    }

    return logs.reverse();
  }

  private hashEntry(entry: {
    tenantId: string;
    agentId: string | null;
    employeeId: string | null;
    action: string;
    permissionLevel: number;
    detail: Record<string, unknown> | null;
    ipAddress: string | null;
    createdAt: string;
    previousHash: string | null;
  }): string {
    return createHash("sha256")
      .update(
        JSON.stringify({
          tenantId: entry.tenantId,
          agentId: entry.agentId,
          employeeId: entry.employeeId,
          action: entry.action,
          permissionLevel: entry.permissionLevel,
          detail: entry.detail,
          ipAddress: entry.ipAddress,
          createdAt: entry.createdAt,
          previousHash: entry.previousHash,
        })
      )
      .digest("hex");
  }

  private extractTaskId(detail: Record<string, unknown> | null): string | null {
    if (!detail) return null;
    if (typeof detail.taskId === "string") return detail.taskId;
    const nestedResult = detail.result;
    if (nestedResult && typeof nestedResult === "object") {
      const resultRecord = nestedResult as Record<string, unknown>;
      if (typeof resultRecord.taskId === "string") return resultRecord.taskId;
    }
    return null;
  }

  private buildTaskSnapshot(task: any): TaskDTO {
    const assignee = task.assignee as { id: string; name?: string | null; avatar?: string | null; avatarUrl?: string | null } | null;
    const creator = task.creator as { id: string; name?: string | null } | null;
    const approvedBy = task.approvedBy as { id: string; name?: string | null } | null;
    const project = task.project as { id: string; name?: string | null } | null;

    return {
      id: task.id,
      tenantId: task.tenantId,
      title: task.title,
      description: task.description ?? null,
      status: task.status,
      riskLevel: task.riskLevel,
      permissionLevel: task.permissionLevel,
      approved: task.approved ?? null,
      approvalComment: task.approvalComment ?? null,
      result: task.result ?? null,
      creator: {
        id: creator?.id ?? "unknown",
        name: creator?.name ?? "未命名",
      },
      assignee: assignee
        ? {
            id: assignee.id,
            name: assignee.name ?? "未命名",
            avatar: assignee.avatar ?? assignee.avatarUrl ?? null,
          }
        : null,
      approvedBy: approvedBy
        ? {
            id: approvedBy.id,
            name: approvedBy.name ?? "未命名",
          }
        : null,
      project: project
        ? {
            id: project.id,
            name: project.name ?? "未命名项目",
          }
        : null,
      startedAt: task.startedAt ? task.startedAt.toISOString() : null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  async log(entry: CreateAuditLogInput): Promise<void> {
    const createdAt = new Date().toISOString();
    const previousHash = this.logs[0]?.currentHash ?? null;
    const detail = (entry.detail as Record<string, unknown>) ?? null;
    const log: AuditLogDTO = {
      id: `log-${randomUUID().slice(0, 8)}`,
      tenantId: entry.tenantId,
      agentId: entry.agentId ?? null,
      employeeId: entry.employeeId ?? null,
      action: entry.action,
      permissionLevel: entry.permissionLevel ?? 1,
      detail,
      ipAddress: entry.ipAddress ?? null,
      previousHash,
      currentHash: this.hashEntry({
        tenantId: entry.tenantId,
        agentId: entry.agentId ?? null,
        employeeId: entry.employeeId ?? null,
        action: entry.action,
        permissionLevel: entry.permissionLevel ?? 1,
        detail,
        ipAddress: entry.ipAddress ?? null,
        createdAt,
        previousHash,
      }),
      createdAt,
    };
    this.logs.unshift(log);
    console.log(`[MockAuditRepo] Logged: ${entry.action}`);
  }

  async findMany(filter?: AuditFilter): Promise<AuditLogDTO[]> {
    let result = [...this.logs];
    if (filter) {
      if (filter.tenantId) result = result.filter((l) => l.tenantId === filter.tenantId);
      if (filter.agentId) result = result.filter((l) => l.agentId === filter.agentId);
      if (filter.employeeId) result = result.filter((l) => l.employeeId === filter.employeeId);
      if (filter.action) result = result.filter((l) => l.action === filter.action);
      if (filter.startDate) result = result.filter((l) => l.createdAt >= filter.startDate!);
      if (filter.endDate) result = result.filter((l) => l.createdAt <= filter.endDate!);
    }

    result = result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? result.length;
    return result.slice(offset, offset + limit);
  }

  async getResponsibilityChain(taskId: string): Promise<ResponsibilityChainNode[]> {
    return [
      { step: 1, type: "human", name: "王老板（CEO）", action: `创建任务 ${taskId} 并分配`, timestamp: new Date(NOW - 86400000 * 3).toISOString(), detail: "分配任务给 AI 架构师" },
      { step: 2, type: "digital_twin", name: "AI 应用架构师（分身）", action: "接收任务，拆解子步骤", timestamp: new Date(NOW - 86400000 * 3 + 3600000).toISOString(), detail: `任务 ${taskId} 被拆解为 3 个子步骤` },
      { step: 3, type: "pure_agent", name: "Worker-001（后台执行）", action: "执行具体子任务", timestamp: new Date(NOW - 86400000 * 3 + 7200000).toISOString(), detail: "调用知识库检索相关文档" },
      { step: 4, type: "tool", name: "知识库检索工具", action: "检索并返回结果", timestamp: new Date(NOW - 86400000 * 3 + 7300000).toISOString(), detail: "检索到 5 篇相关文档" },
      { step: 5, type: "pure_agent", name: "Worker-001（后台执行）", action: "生成输出结果", timestamp: new Date(NOW - 86400000 * 3 + 14400000).toISOString(), detail: "生成报告初稿" },
      { step: 6, type: "digital_twin", name: "市场分析师（分身）", action: "审核输出并提交", timestamp: new Date(NOW - 86400000 * 2).toISOString(), detail: "审核通过，提交给王老板" },
      { step: 7, type: "human", name: "王老板（CEO）", action: "审批确认", timestamp: new Date(NOW - 86400000).toISOString(), detail: "审批通过" },
    ];
  }

  async getTaskReplay(taskId: string): Promise<TaskReplayDTO> {
    const [auditLogs, responsibilityChain, task] = await Promise.all([
      this.findMany({ tenantId: DEFAULT_TENANT_ID }).then((logs) => logs.filter((log) => this.extractTaskId(log.detail) === taskId)),
      this.getResponsibilityChain(taskId),
      db.task.findUnique({
        where: { id: taskId },
        include: {
          creator: true,
          assignee: true,
          approvedBy: true,
          project: true,
        },
      }),
    ]);

    return {
      task: task ? this.buildTaskSnapshot(task) : null,
      auditLogs,
      responsibilityChain,
      exportedAt: new Date().toISOString(),
      summary: {
        taskId,
        logCount: auditLogs.length,
        stepCount: responsibilityChain.length,
        actionCount: new Set(auditLogs.map((log) => log.action)).size,
      },
    };
  }

  async getStats(tenantId: string): Promise<AuditStats> {
    const tenantLogs = this.logs.filter((l) => l.tenantId === tenantId);
    const byAction: Record<string, number> = {};
    const byPermissionLevel: Record<string, number> = {};

    tenantLogs.forEach((l) => {
      byAction[l.action] = (byAction[l.action] ?? 0) + 1;
      const key = `L${l.permissionLevel}`;
      byPermissionLevel[key] = (byPermissionLevel[key] ?? 0) + 1;
    });

    return {
      totalLogs: tenantLogs.length,
      byAction,
      byPermissionLevel,
      recentDays: [
        { date: new Date(NOW - 86400000 * 2).toISOString().split("T")[0]!, count: 8 },
        { date: new Date(NOW - 86400000).toISOString().split("T")[0]!, count: 15 },
        { date: new Date(NOW).toISOString().split("T")[0]!, count: 6 },
      ],
    };
  }

  async countByAction(tenantId: string, action: string, since: Date): Promise<number> {
    return this.logs.filter(
      (l) => l.tenantId === tenantId && l.action === action && new Date(l.createdAt) >= since
    ).length;
  }
}

/** Singleton */
export const auditRepo = new MockAuditRepository();
