// ─────────────────────────────────────────────────────────
// 数智企业 · Prisma Agent 仓库
// ─────────────────────────────────────────────────────────

import { db } from "~/server/db";
import type { Prisma } from "@lobster/db";
import type {
  AgentDTO,
  CreateAgentInput,
  AgentFilter,
  AgentCoreMemoryDTO,
  AgentMemoryDTO,
  CreateMemoryInput,
  GrowthCurvePoint,
  MemoryFilterInput,
  RoleDefinition,
} from "@lobster/types";
import type { IAgentRepository } from "../types";
import { DEFAULT_TENANT_ID } from "~/lib/data";

const agentInclude = {
  coreMemory: true,
  _count: { select: { memories: true, tasks: true } },
} as const;

type AgentWithRelations = Prisma.AgentGetPayload<{ include: typeof agentInclude }>;

function parseSkills(json: string): string[] {
  try { const p = JSON.parse(json) as unknown; return Array.isArray(p) ? p.filter((i): i is string => typeof i === "string") : []; } catch { return []; }
}

function roleDefFromJson(j: Prisma.JsonValue | null): RoleDefinition | null {
  if (!j || typeof j !== "object" || Array.isArray(j)) return null;
  const r = j as Record<string, unknown>;
  return {
    title: String(r.title ?? ""),
    skills: Array.isArray(r.skills) ? r.skills.filter((s): s is string => typeof s === "string") : [],
    personality: String(r.personality ?? ""),
    boundaries: String(r.boundaries ?? ""),
  };
}

function toAgentDTO(agent: AgentWithRelations): AgentDTO {
  const coreMemory: AgentCoreMemoryDTO | null = agent.coreMemory
    ? {
        agentId: agent.coreMemory.agentId,
        roleDefinition: roleDefFromJson(agent.coreMemory.roleDefinition) ?? { title: "", skills: [], personality: "", boundaries: "" },
        experienceSummary: agent.coreMemory.experienceSummary ?? null,
        totalTasksCompleted: agent.coreMemory.totalTasksCompleted,
        successRate: agent.coreMemory.successRate,
        updatedAt: agent.coreMemory.updatedAt.toISOString(),
      }
    : null;

  return {
    id: agent.id,
    tenantId: agent.tenantId,
    name: agent.name,
    type: agent.type as AgentDTO["type"],
    ownerId: agent.ownerId,
    ownerName: "", // populated from owner relation if needed
    presetRoleId: agent.presetRoleId ?? null,
    skillTags: parseSkills(agent.skillTags),
    permissionBm: agent.permissionBm,
    status: agent.status as AgentDTO["status"],
    avatar: agent.avatar ?? null,
    isActive: agent.isActive,
    coreMemory,
    memoryCount: agent._count.memories,
    taskCount: agent._count.tasks,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
  };
}

function toCoreMemoryDTO(memory: {
  agentId: string;
  roleDefinition: Prisma.JsonValue;
  experienceSummary: string | null;
  totalTasksCompleted: number;
  successRate: number;
  updatedAt: Date;
}): AgentCoreMemoryDTO {
  return {
    agentId: memory.agentId,
    roleDefinition: roleDefFromJson(memory.roleDefinition) ?? { title: "", skills: [], personality: "", boundaries: "" },
    experienceSummary: memory.experienceSummary ?? null,
    totalTasksCompleted: memory.totalTasksCompleted,
    successRate: memory.successRate,
    updatedAt: memory.updatedAt.toISOString(),
  };
}

function toMemoryDTO(m: {
  id: string; agentId: string; type: string; summary: string;
  importance: number; metadata: Prisma.JsonValue | null; createdAt: Date;
}): AgentMemoryDTO {
  return {
    id: m.id,
    agentId: m.agentId,
    projectId: null,
    source: "auto",
    type: m.type as AgentMemoryDTO["type"],
    summary: m.summary,
    importance: m.importance,
    metadata: (m.metadata as Record<string, unknown> | null) ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

export class PrismaAgentRepository implements IAgentRepository {
  async findById(id: string): Promise<AgentDTO | null> {
    const agent = await db.agent.findUnique({ where: { id }, include: agentInclude });
    return agent ? toAgentDTO(agent) : null;
  }

  async findMany(filter?: AgentFilter): Promise<AgentDTO[]> {
    const agents = await db.agent.findMany({
      where: {
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.ownerId ? { ownerId: filter.ownerId } : {}),
        ...(filter?.type ? { type: filter.type } : {}),
        ...(filter?.isActive !== undefined ? { isActive: filter.isActive } : {}),
      },
      include: agentInclude,
      orderBy: { createdAt: "asc" },
    });
    return agents.map(toAgentDTO);
  }

  async create(data: CreateAgentInput): Promise<AgentDTO> {
    // Resolve tenantId from owner
    const owner = await db.employee.findUnique({ where: { id: data.ownerId }, select: { tenantId: true } });
    const tid = owner?.tenantId ?? DEFAULT_TENANT_ID;

    const agent = await db.agent.create({
      data: {
        tenantId: tid,
        name: data.name,
        type: data.type ?? "DIGITAL_TWIN",
        ownerId: data.ownerId,
        presetRoleId: data.presetRoleId ?? null,
        skillTags: JSON.stringify(data.skillTags ?? []),
        permissionBm: data.permissionBm ?? 1,
        status: "IDLE",
        isActive: true,
      },
      include: agentInclude,
    });

    if (data.coreMemory) {
      await db.agentCoreMemory.create({
        data: {
          agentId: agent.id,
          roleDefinition: data.coreMemory.roleDefinition as unknown as Prisma.InputJsonValue,
          experienceSummary: data.coreMemory.experienceSummary ?? null,
          totalTasksCompleted: 0,
          successRate: 0,
        },
      });
    }

    return this.findById(agent.id) as Promise<AgentDTO>;
  }

  async update(id: string, data: Partial<CreateAgentInput>): Promise<AgentDTO> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.skillTags !== undefined) updateData.skillTags = JSON.stringify(data.skillTags);
    if (data.permissionBm !== undefined) updateData.permissionBm = data.permissionBm;

    if (Object.keys(updateData).length > 0) {
      await db.agent.update({ where: { id }, data: updateData });
    }

    if (data.coreMemory) {
      await db.agentCoreMemory.upsert({
        where: { agentId: id },
        create: {
          agentId: id,
          roleDefinition: data.coreMemory.roleDefinition as unknown as Prisma.InputJsonValue,
          experienceSummary: data.coreMemory.experienceSummary ?? null,
          totalTasksCompleted: 0,
          successRate: 0,
        },
        update: {
          roleDefinition: data.coreMemory.roleDefinition as unknown as Prisma.InputJsonValue,
          experienceSummary: data.coreMemory.experienceSummary ?? null,
        },
      });
    }

    return this.findById(id) as Promise<AgentDTO>;
  }

  async delete(id: string): Promise<void> {
    await db.agent.delete({ where: { id } });
  }

  async count(filter?: AgentFilter): Promise<number> {
    return db.agent.count({
      where: {
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.ownerId ? { ownerId: filter.ownerId } : {}),
        ...(filter?.type ? { type: filter.type } : {}),
        ...(filter?.isActive !== undefined ? { isActive: filter.isActive } : {}),
      },
    });
  }

  async findByOwner(ownerId: string): Promise<AgentDTO[]> {
    return this.findMany({ ownerId });
  }

  async findByStatus(status: string): Promise<AgentDTO[]> {
    return this.findMany({ status: status as AgentDTO["status"] });
  }

  async getCoreMemory(agentId: string): Promise<AgentCoreMemoryDTO | null> {
    const memory = await db.agentCoreMemory.findUnique({ where: { agentId } });
    return memory ? toCoreMemoryDTO(memory) : null;
  }

  async updateCoreMemory(agentId: string, data: Partial<AgentCoreMemoryDTO>): Promise<AgentCoreMemoryDTO> {
    const memory = await db.agentCoreMemory.upsert({
      where: { agentId },
      create: {
        agentId,
        roleDefinition: (data.roleDefinition ?? { title: "", skills: [], personality: "", boundaries: "" }) as unknown as Prisma.InputJsonValue,
        experienceSummary: data.experienceSummary ?? null,
        totalTasksCompleted: data.totalTasksCompleted ?? 0,
        successRate: data.successRate ?? 0,
      },
      update: {
        ...(data.roleDefinition ? { roleDefinition: data.roleDefinition as unknown as Prisma.InputJsonValue } : {}),
        ...(data.experienceSummary !== undefined ? { experienceSummary: data.experienceSummary } : {}),
        ...(data.totalTasksCompleted !== undefined ? { totalTasksCompleted: data.totalTasksCompleted } : {}),
        ...(data.successRate !== undefined ? { successRate: data.successRate } : {}),
      },
    });
    return toCoreMemoryDTO(memory);
  }

  async addMemory(agentId: string, mem: CreateMemoryInput): Promise<AgentMemoryDTO> {
    const created = await db.agentMemory.create({
      data: {
        agentId,
        type: mem.type ?? "success",
        summary: mem.summary,
        importance: mem.importance ?? 1,
        metadata: (mem.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
    return toMemoryDTO(created);
  }

  async findRelatedMemories(
    agentId: string,
    query: string,
    limit = 10,
    filter?: MemoryFilterInput,
  ): Promise<AgentMemoryDTO[]> {
    const memories = await db.agentMemory.findMany({
      where: {
        agentId,
        ...(filter?.type ? { type: filter.type } : {}),
        ...(query ? { summary: { contains: query } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return memories.map(toMemoryDTO);
  }

  async getGrowthCurve(agentId: string): Promise<GrowthCurvePoint[]> {
    const memories = await db.agentMemory.findMany({
      where: { agentId, type: "success" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, importance: true },
    });

    let cumulative = 0;
    let count = 0;
    return memories.map((m) => {
      cumulative += m.importance;
      count++;
      return {
        date: m.createdAt.toISOString().slice(0, 10),
        tasksCompleted: count,
        successRate: count > 0 ? 0.8 : 0,
        averageImportance: count > 0 ? cumulative / count : 0,
      };
    });
  }
}

export const agentRepo = new PrismaAgentRepository();
