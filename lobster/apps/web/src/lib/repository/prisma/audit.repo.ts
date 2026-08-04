// ─────────────────────────────────────────────────────────
// 数智企业 · Prisma 审计日志仓库
// ─────────────────────────────────────────────────────────

import { createHash, randomUUID } from "crypto";
import { db } from "~/server/db";
import type { Prisma } from "@lobster/db";
import type {
  AuditFilter,
  AuditLogDTO,
  AuditStats,
  CreateAuditLogInput,
  ResponsibilityChainNode,
  TaskReplayDTO,
} from "@lobster/types";
import type { IAuditRepository } from "../types";
import { DEFAULT_TENANT_ID } from "~/lib/data";

const auditSelect = {
  id: true, tenantId: true, agentId: true, employeeId: true,
  action: true, permissionLevel: true, detail: true,
  ipAddress: true, userAgent: true, previousHash: true, currentHash: true, createdAt: true,
} as const;

type AuditRow = Prisma.AuditLogGetPayload<{ select: typeof auditSelect }>;

function computeHash(log: { id: string; action: string; previousHash: string | null }): string {
  const raw = `${log.id}:${log.action}:${log.previousHash ?? "genesis"}`;
  return createHash("sha256").update(raw).digest("hex");
}

async function getPreviousHash(): Promise<string | null> {
  const last = await db.auditLog.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, action: true },
  });
  if (!last) return null;
  return createHash("sha256").update(`${last.id}:${last.action}:genesis`).digest("hex");
}

function fromDetailPath(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

export class PrismaAuditRepository implements IAuditRepository {
  async log(entry: CreateAuditLogInput): Promise<void> {
    const id = randomUUID();
    const previousHash = await getPreviousHash();
    const currentHash = computeHash({ id, action: entry.action, previousHash });

    const createData: Record<string, unknown> = {
      id,
      tenantId: entry.tenantId ?? DEFAULT_TENANT_ID,
      agentId: entry.agentId ?? null,
      employeeId: entry.employeeId ?? null,
      action: entry.action,
      permissionLevel: entry.permissionLevel ?? 1,
      ipAddress: entry.ipAddress ?? null,
    };
    if (entry.detail) {
      createData.detail = entry.detail;
    }

    await db.auditLog.create({ data: createData as Parameters<typeof db.auditLog.create>[0]["data"] });

    // 写入 hash 链
    try {
      await db.auditLog.update({
        where: { id },
        data: { previousHash, currentHash },
      });
    } catch { /* hash 写入失败不影响主流程 */ }

    void previousHash;
    void currentHash;
  }

  async findMany(filter?: AuditFilter): Promise<AuditLogDTO[]> {
    const logs = await db.auditLog.findMany({
      where: {
        tenantId: filter?.tenantId ?? DEFAULT_TENANT_ID,
        ...(filter?.agentId ? { agentId: filter.agentId } : {}),
        ...(filter?.employeeId ? { employeeId: filter.employeeId } : {}),
        ...(filter?.action ? { action: filter.action } : {}),
        ...(filter?.startDate ?? filter?.endDate
          ? {
              createdAt: {
                ...(filter?.startDate ? { gte: new Date(filter.startDate) } : {}),
                ...(filter?.endDate ? { lte: new Date(filter.endDate) } : {}),
              },
            }
          : {}),
      },
      select: auditSelect,
      orderBy: { createdAt: "desc" },
      take: filter?.limit ?? 50,
      skip: filter?.offset ?? 0,
    });

    return logs.map((log: AuditRow) => ({
      id: log.id,
      tenantId: log.tenantId,
      agentId: log.agentId ?? null,
      employeeId: log.employeeId ?? null,
      action: log.action,
      permissionLevel: log.permissionLevel,
      detail: fromDetailPath(log.detail),
      ipAddress: log.ipAddress ?? null,
      previousHash: log.previousHash ?? null,
      currentHash: log.currentHash ?? "",
      createdAt: log.createdAt.toISOString(),
    }));
  }

  async getResponsibilityChain(taskId: string): Promise<ResponsibilityChainNode[]> {
    // Use string-based JSON filtering by searching in the detail field
    const allLogs = await db.auditLog.findMany({
      where: {
        // Filter in application layer since Prisma JSON path has version-specific API
      },
      select: { id: true, action: true, agentId: true, employeeId: true, detail: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const logs = allLogs.filter((log) => {
      const d = log.detail as Record<string, unknown> | null;
      return d?.taskId === taskId;
    });

    return logs.map((log, idx) => ({
      step: idx + 1,
      type: (log.agentId ? "digital_twin" : "human") as ResponsibilityChainNode["type"],
      name: log.agentId ?? log.employeeId ?? "unknown",
      action: log.action,
      timestamp: log.createdAt.toISOString(),
      detail: log.detail ? JSON.stringify(log.detail) : null,
    }));
  }

  async getTaskReplay(taskId: string): Promise<TaskReplayDTO> {
    const chain = await this.getResponsibilityChain(taskId);

    const allLogs = await db.auditLog.findMany({
      select: auditSelect,
      orderBy: { createdAt: "asc" },
    });

    const logs = allLogs.filter((log) => {
      const d = log.detail as Record<string, unknown> | null;
      return d?.taskId === taskId;
    });

    const auditLogs: AuditLogDTO[] = logs.map((log: AuditRow) => ({
      id: log.id,
      tenantId: log.tenantId,
      agentId: log.agentId ?? null,
      employeeId: log.employeeId ?? null,
      action: log.action,
      permissionLevel: log.permissionLevel,
      detail: fromDetailPath(log.detail),
      ipAddress: log.ipAddress ?? null,
      previousHash: null,
      currentHash: "",
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      task: null,
      auditLogs,
      responsibilityChain: chain,
      exportedAt: new Date().toISOString(),
      summary: {
        taskId,
        logCount: auditLogs.length,
        stepCount: chain.length,
        actionCount: auditLogs.length,
      },
    };
  }

  async getStats(tenantId: string): Promise<AuditStats> {
    const logs = await db.auditLog.findMany({
      where: { tenantId },
      select: { action: true, permissionLevel: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const byAction: Record<string, number> = {};
    const byPermissionLevel: Record<string, number> = {};
    const dayCounts = new Map<string, number>();

    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] ?? 0) + 1;
      byPermissionLevel[String(log.permissionLevel)] = (byPermissionLevel[String(log.permissionLevel)] ?? 0) + 1;
      const day = log.createdAt.toISOString().slice(0, 10);
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    }

    const recentDays = Array.from(dayCounts, ([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    return {
      totalLogs: logs.length,
      byAction,
      byPermissionLevel,
      recentDays,
    };
  }

  async countByAction(tenantId: string, action: string, since: Date): Promise<number> {
    return db.auditLog.count({
      where: { tenantId, action, createdAt: { gte: since } },
    });
  }
}

export const auditRepo = new PrismaAuditRepository();
