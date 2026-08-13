// ─────────────────────────────────────────────────────────
// 数智企业 · Mock Agent 仓库
// ─────────────────────────────────────────────────────────

import type {
  AgentDTO,
  CreateAgentInput,
  AgentFilter,
  AgentCoreMemoryDTO,
  AgentMemoryDTO,
  CreateMemoryInput,
  GrowthCurvePoint,
  MemoryFilterInput,
} from "@lobster/types";
import type { IAgentRepository } from "../types";
import { DEFAULT_AGENTS, DEFAULT_TENANT_ID } from "../../data";

export class MockAgentRepository implements IAgentRepository {
  private agents: Map<string, AgentDTO>;
  private memories: Map<string, AgentMemoryDTO[]>;

  constructor() {
    this.agents = new Map();
    this.memories = new Map();

    // 初始化默认 Agent
    DEFAULT_AGENTS.forEach((a) => {
      this.agents.set(a.id, {
        id: a.id,
        tenantId: DEFAULT_TENANT_ID,
        name: a.name,
        type: "DIGITAL_TWIN",
        ownerId: a.ownerId,
        ownerName: "王老板",
        presetRoleId: a.presetRoleId,
        skillTags: a.skillTags,
        permissionBm: a.permissionBm,
        status: a.status,
        avatar: null,
        isActive: true,
        coreMemory: {
          agentId: a.id,
          roleDefinition: a.coreMemory.roleDefinition,
          experienceSummary: a.coreMemory.experienceSummary,
          totalTasksCompleted: a.coreMemory.totalTasksCompleted,
          successRate: a.coreMemory.successRate,
          updatedAt: new Date().toISOString(),
        },
        memoryCount: 0,
        taskCount: Math.floor(Math.random() * 15),
        createdAt: new Date("2026-01-01").toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 初始化模拟记忆
      this.memories.set(a.id, [
        {
          id: `mem-${a.id}-1`,
          agentId: a.id,
          projectId: null,
          source: "auto",
          type: "success",
          summary: `完成了 ${a.name} 的首次任务，结果被采纳`,
          importance: 3,
          metadata: { taskId: `task-${a.id}-1` },
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        },
        {
          id: `mem-${a.id}-2`,
          agentId: a.id,
          projectId: null,
          source: "auto",
          type: a.coreMemory.totalTasksCompleted > 15 ? "insight" : "preference",
          summary: a.coreMemory.totalTasksCompleted > 15
            ? `积累了 ${a.coreMemory.totalTasksCompleted} 次任务经验，形成了高效的 ${a.coreMemory.roleDefinition.skills[0]} 方法论`
            : "偏好使用结构化输出格式，便于后续分析",
          importance: a.coreMemory.totalTasksCompleted > 15 ? 4 : 2,
          metadata: {},
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
      ]);
    });
  }

  async findById(id: string): Promise<AgentDTO | null> {
    return this.agents.get(id) ?? null;
  }

  async findMany(filter?: AgentFilter): Promise<AgentDTO[]> {
    let result = Array.from(this.agents.values());
    if (filter) {
      if (filter.status) result = result.filter((a) => a.status === filter.status);
      if (filter.ownerId) result = result.filter((a) => a.ownerId === filter.ownerId);
      if (filter.type) result = result.filter((a) => a.type === filter.type);
      if (filter.isActive !== undefined) result = result.filter((a) => a.isActive === filter.isActive);
    }
    return result;
  }

  async create(data: CreateAgentInput): Promise<AgentDTO> {
    const id = `agent-${crypto.randomUUID().slice(0, 8)}`;
    const agent: AgentDTO = {
      id,
      tenantId: DEFAULT_TENANT_ID,
      name: data.name,
      type: data.type,
      ownerId: data.ownerId,
      ownerName: "王老板",
      presetRoleId: data.presetRoleId ?? null,
      skillTags: data.skillTags,
      permissionBm: data.permissionBm ?? 1,
      status: "IDLE",
      avatar: data.avatar ?? null,
      isActive: true,
      coreMemory: data.coreMemory
        ? {
            agentId: id,
            roleDefinition: data.coreMemory.roleDefinition,
            experienceSummary: data.coreMemory.experienceSummary ?? null,
            totalTasksCompleted: 0,
            successRate: 0,
            updatedAt: new Date().toISOString(),
          }
        : null,
      memoryCount: 0,
      taskCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.agents.set(id, agent);
    console.log(`[MockAgentRepo] Created agent: ${agent.name} (${id})`);
    return agent;
  }

  async update(id: string, data: Partial<CreateAgentInput>): Promise<AgentDTO> {
    const existing = this.agents.get(id);
    if (!existing) throw new Error(`Agent ${id} not found`);
    const updated: AgentDTO = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    } as AgentDTO;
    this.agents.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.agents.delete(id);
    this.memories.delete(id);
  }

  async count(filter?: AgentFilter): Promise<number> {
    const result = await this.findMany(filter);
    return result.length;
  }

  async findByOwner(ownerId: string): Promise<AgentDTO[]> {
    return Array.from(this.agents.values()).filter((a) => a.ownerId === ownerId);
  }

  async findByStatus(status: string): Promise<AgentDTO[]> {
    return Array.from(this.agents.values()).filter((a) => a.status === status);
  }

  async getCoreMemory(agentId: string): Promise<AgentCoreMemoryDTO | null> {
    const agent = this.agents.get(agentId);
    return agent?.coreMemory ?? null;
  }

  async updateCoreMemory(agentId: string, data: Partial<AgentCoreMemoryDTO>): Promise<AgentCoreMemoryDTO> {
    const agent = this.agents.get(agentId);
    if (!agent?.coreMemory) throw new Error(`Core memory not found for agent ${agentId}`);
    agent.coreMemory = { ...agent.coreMemory, ...data, updatedAt: new Date().toISOString() };
    return agent.coreMemory;
  }

  async addMemory(agentId: string, memory: CreateMemoryInput): Promise<AgentMemoryDTO> {
    const agentMemories = this.memories.get(agentId) ?? [];
    const newMemory: AgentMemoryDTO = {
      id: `mem-${crypto.randomUUID().slice(0, 8)}`,
      agentId,
      projectId: memory.projectId ?? null,
      source: memory.source ?? "auto",
      type: memory.type,
      summary: memory.summary,
      importance: memory.importance ?? 1,
      metadata: (memory.metadata as Record<string, unknown>) ?? null,
      createdAt: new Date().toISOString(),
    };
    agentMemories.push(newMemory);
    this.memories.set(agentId, agentMemories);

    // 更新 Agent 的记忆计数
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.memoryCount = agentMemories.length;
    }
    return newMemory;
  }

  async findRelatedMemories(
    agentId: string,
    query: string,
    limit = 5,
    filter?: MemoryFilterInput,
  ): Promise<AgentMemoryDTO[]> {
    const normalizedQuery = query.trim().toLowerCase();
    const memories = (this.memories.get(agentId) ?? [])
      .filter((memory) => {
        if (filter?.projectId !== undefined && memory.projectId !== (filter.projectId ?? null)) return false;
        if (filter?.type && memory.type !== filter.type) return false;
        if (filter?.source && memory.source !== filter.source) return false;
        if (filter?.minImportance !== undefined && memory.importance < filter.minImportance) return false;
        if (filter?.maxImportance !== undefined && memory.importance > filter.maxImportance) return false;
        if (filter?.since && memory.createdAt < filter.since) return false;
        if (filter?.until && memory.createdAt > filter.until) return false;
        return true;
      })
      .filter((memory) => {
        if (!normalizedQuery) return true;
        const haystack = [memory.summary, memory.type, memory.source, JSON.stringify(memory.metadata ?? {})]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (b.importance !== a.importance) return b.importance - a.importance;
        return b.createdAt.localeCompare(a.createdAt);
      });

    return memories.slice(0, limit);
  }

  async getGrowthCurve(agentId: string): Promise<GrowthCurvePoint[]> {
    const agent = this.agents.get(agentId);
    if (!agent) return [];

    // 生成过去 30 天的模拟成长曲线
    const points: GrowthCurvePoint[] = [];
    const totalTasks = agent.coreMemory?.totalTasksCompleted ?? 10;
    const baseRate = agent.coreMemory?.successRate ?? 0.85;

    for (let i = 30; i >= 0; i--) {
      const date = new Date(Date.now() - 86400000 * i);
      const dayProgress = Math.max(1, Math.floor(totalTasks / 30));
      points.push({
        date: date.toISOString().split("T")[0]!,
        tasksCompleted: dayProgress * (30 - i),
        successRate: Math.min(1, baseRate + i * 0.003),
        averageImportance: Math.min(5, 2 + i * 0.05),
      });
    }
    return points;
  }
}

/** Singleton */
export const agentRepo = new MockAgentRepository();
