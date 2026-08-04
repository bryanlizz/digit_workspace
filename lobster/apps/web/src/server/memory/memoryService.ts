import { db } from "~/server/db";
import type { MemoryFilterInput } from "@lobster/types";

export interface MemoryRecord {
  id: string;
  agentId: string;
  projectId: string | null;
  source: "auto" | "suggested" | "manual";
  type: string;
  summary: string;
  importance: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

type AgentMemoryRow = Awaited<ReturnType<typeof db.agentMemory.findMany>>[number];
/**
 * 记忆服务
 * 管理 Agent 长期记忆的创建、检索和摘要
 */
export class MemoryService {
  /**
   * 创建记忆片段
   */
  async createMemory(
    agentId: string,
    taskTitle: string,
    executionLog: string,
    success: boolean,
    projectId: string | null = null,
    source: "auto" | "suggested" | "manual" = "auto",
    metadata: Record<string, unknown> = {},
  ): Promise<MemoryRecord> {
    const summary = await this.generateSummary(taskTitle, executionLog, success);
    const importance = this.calculateImportance(executionLog, success);

    const memory = await db.agentMemory.create({
      data: {
        agentId,
        type: success ? "success" : "failure",
        summary,
        importance,
        metadata: {
          taskTitle,
          timestamp: new Date().toISOString(),
          logLength: executionLog.length,
          projectId,
          source,
          ...metadata,
        },
      },
    });

    return this.toRecord(memory, projectId, source);
  }

  /**
   * 相似记忆检索
   */
  async searchSimilarMemories(
    agentId: string,
    query: string,
    limit = 5,
    filter: MemoryFilterInput = {},
  ): Promise<MemoryRecord[]> {
    const memories = await db.agentMemory.findMany({
      where: {
        agentId,
        ...(filter.type ? { type: filter.type } : {}),
      },
      orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
    });

    return memories
      .map((memory: AgentMemoryRow) => this.toRecord(memory, this.getProjectId(memory), this.getSource(memory)))
      .filter((memory: MemoryRecord) => this.matchesFilter(memory, query, filter))
      .slice(0, limit);
  }

  /**
   * 更新 Agent 经验摘要
   */
  async updateExperienceSummary(agentId: string): Promise<void> {
    const totalTasks = await db.agentMemory.count({ where: { agentId } });
    const successCount = await db.agentMemory.count({
      where: { agentId, type: "success" },
    });

    const recentMemories = await db.agentMemory.findMany({
      where: { agentId, type: "success" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const summaryText = recentMemories.map((m: AgentMemoryRow) => m.summary).join("；");
    const newSummary = `已完成 ${totalTasks} 项任务，成功率 ${totalTasks > 0 ? Math.round((successCount / totalTasks) * 100) : 0}%。${summaryText ? `最近经验：${summaryText}` : ""}`;

    await db.agentCoreMemory.upsert({
      where: { agentId },
      update: {
        experienceSummary: newSummary.slice(0, 500),
        totalTasksCompleted: totalTasks,
        successRate: totalTasks > 0 ? successCount / totalTasks : 0,
      },
      create: {
        agentId,
        roleDefinition: { title: "数字员工", skills: [], personality: "", boundaries: "" },
        experienceSummary: newSummary.slice(0, 500),
        totalTasksCompleted: totalTasks,
        successRate: totalTasks > 0 ? successCount / totalTasks : 0,
      },
    });
  }

  /** 获取所有记忆 */
  async listMemories(
    agentId: string,
    type?: string,
    limit = 20,
    offset = 0,
    filter: MemoryFilterInput = {},
  ): Promise<{ data: MemoryRecord[]; total: number }> {
    const memories = await db.agentMemory.findMany({
      where: { agentId, ...(type ? { type } : {}) },
      orderBy: [{ createdAt: "desc" }],
    });

    const records = memories.map((memory: AgentMemoryRow) => this.toRecord(memory, this.getProjectId(memory), this.getSource(memory)));
    const filtered = records.filter((memory: MemoryRecord) => this.matchesFilter(memory, "", filter));

    return {
      data: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }

  private toRecord(memory: AgentMemoryRow, projectId: string | null, source: "auto" | "suggested" | "manual"): MemoryRecord {
    return {
      id: memory.id,
      agentId: memory.agentId,
      projectId,
      source,
      type: memory.type,
      summary: memory.summary,
      importance: memory.importance,
      metadata: memory.metadata as Record<string, unknown> | null,
      createdAt: memory.createdAt.toISOString(),
    };
  }

  private getProjectId(memory: AgentMemoryRow): string | null {
    const metadata = memory.metadata as Record<string, unknown> | null;
    return metadata && typeof metadata.projectId === "string" ? metadata.projectId : null;
  }

  private getSource(memory: AgentMemoryRow): "auto" | "suggested" | "manual" {
    const metadata = memory.metadata as Record<string, unknown> | null;
    const source = metadata && typeof metadata.source === "string" ? metadata.source : "auto";
    return source === "suggested" || source === "manual" ? source : "auto";
  }

  private matchesFilter(memory: MemoryRecord, query: string, filter: MemoryFilterInput): boolean {
    if (filter.projectId !== undefined && memory.projectId !== (filter.projectId ?? null)) return false;
    if (filter.type && memory.type !== filter.type) return false;
    if (filter.source && memory.source !== filter.source) return false;
    if (filter.minImportance !== undefined && memory.importance < filter.minImportance) return false;
    if (filter.maxImportance !== undefined && memory.importance > filter.maxImportance) return false;
    if (filter.since && memory.createdAt < filter.since) return false;
    if (filter.until && memory.createdAt > filter.until) return false;

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;
    const haystack = [memory.summary, memory.type, memory.source, JSON.stringify(memory.metadata ?? {})].join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  }

  private async generateSummary(taskTitle: string, executionLog: string, success: boolean): Promise<string> {
    const prefix = success ? "✓ 成功" : "✗ 失败";
    return `${prefix}「${taskTitle}」：${executionLog.slice(0, 80)}...`;
  }

  private calculateImportance(log: string, success: boolean): number {
    const lengthScore = Math.min(5, Math.floor(log.length / 200));
    const successScore = success ? 0 : 2;
    return Math.min(5, Math.max(1, lengthScore + successScore));
  }
}

export const memoryService = new MemoryService();
