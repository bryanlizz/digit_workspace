// ─────────────────────────────────────────────────────────
// 数智企业 · Prisma 项目仓库
// ─────────────────────────────────────────────────────────

import { db } from "~/server/db";
import type { Prisma } from "@lobster/db";
import type {
  ProjectDTO,
  ProjectDetailDTO,
  CreateProjectInput,
  ProjectFilter,
} from "@lobster/types";
import type { IProjectRepository } from "../types";
import { DEFAULT_TENANT_ID } from "~/lib/data";

const projectInclude = {
  tasks: { select: { id: true, title: true, status: true, assignee: { select: { name: true } } } },
  _count: { select: { tasks: true, messages: true } },
} as const;

type ProjectWithRelations = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

function parseIds(json: string): string[] {
  try { const p = JSON.parse(json) as unknown; return Array.isArray(p) ? p.filter((i): i is string => typeof i === "string") : []; } catch { return []; }
}

function computeTaskStatusCounts(tasks: Array<{ status: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
  }
  return counts;
}

function toProjectDTO(project: ProjectWithRelations): ProjectDTO {
  return {
    id: project.id,
    tenantId: project.tenantId,
    name: project.name,
    description: project.description ?? null,
    status: project.status as ProjectDTO["status"],
    participantAgentCount: parseIds(project.participantAgentIds).length,
    participantEmployeeCount: parseIds(project.participantEmployeeIds).length,
    taskCount: project._count.tasks,
    taskStatusCounts: computeTaskStatusCounts(project.tasks),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

function toProjectDetailDTO(project: ProjectWithRelations): ProjectDetailDTO {
  return {
    ...toProjectDTO(project),
    participantAgentIds: parseIds(project.participantAgentIds),
    participantEmployeeIds: parseIds(project.participantEmployeeIds),
    tasks: project.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      assigneeName: t.assignee?.name ?? null,
    })),
  };
}

export class PrismaProjectRepository implements IProjectRepository {
  async findById(id: string): Promise<ProjectDTO | null> {
    const project = await db.project.findUnique({ where: { id }, include: projectInclude });
    return project ? toProjectDTO(project) : null;
  }

  async getByIdWithDetails(id: string): Promise<ProjectDetailDTO | null> {
    const project = await db.project.findUnique({ where: { id }, include: projectInclude });
    return project ? toProjectDetailDTO(project) : null;
  }

  async findMany(filter?: ProjectFilter): Promise<ProjectDTO[]> {
    const projects = await db.project.findMany({
      where: {
        tenantId: filter?.tenantId ?? DEFAULT_TENANT_ID,
        ...(filter?.status ? { status: filter.status } : {}),
      },
      include: projectInclude,
      orderBy: { updatedAt: "desc" },
    });
    return projects.map(toProjectDTO);
  }

  async create(data: CreateProjectInput): Promise<ProjectDTO> {
    const project = await db.project.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        name: data.name,
        description: data.description ?? null,
        status: "ACTIVE",
        participantAgentIds: JSON.stringify(data.participantAgentIds ?? []),
        participantEmployeeIds: JSON.stringify(data.participantEmployeeIds ?? []),
      },
      include: projectInclude,
    });
    return toProjectDTO(project);
  }

  async update(id: string, data: Partial<CreateProjectInput>): Promise<ProjectDTO> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.participantAgentIds !== undefined) updateData.participantAgentIds = JSON.stringify(data.participantAgentIds);
    if (data.participantEmployeeIds !== undefined) updateData.participantEmployeeIds = JSON.stringify(data.participantEmployeeIds);

    const project = await db.project.update({
      where: { id },
      data: updateData,
      include: projectInclude,
    });
    return toProjectDTO(project);
  }

  async delete(id: string): Promise<void> {
    await db.project.delete({ where: { id } });
  }

  async count(filter?: ProjectFilter): Promise<number> {
    return db.project.count({
      where: {
        tenantId: filter?.tenantId ?? DEFAULT_TENANT_ID,
        ...(filter?.status ? { status: filter.status } : {}),
      },
    });
  }

  async findByTenant(tenantId: string): Promise<ProjectDTO[]> {
    return this.findMany({ tenantId });
  }

  async addParticipant(projectId: string, agentId: string): Promise<void> {
    const project = await db.project.findUnique({ where: { id: projectId }, select: { participantAgentIds: true } });
    if (!project) throw new Error(`Project ${projectId} not found`);
    const ids = parseIds(project.participantAgentIds);
    if (!ids.includes(agentId)) {
      ids.push(agentId);
      await db.project.update({ where: { id: projectId }, data: { participantAgentIds: JSON.stringify(ids) } });
    }
  }

  async removeParticipant(projectId: string, agentId: string): Promise<void> {
    const project = await db.project.findUnique({ where: { id: projectId }, select: { participantAgentIds: true } });
    if (!project) throw new Error(`Project ${projectId} not found`);
    const ids = parseIds(project.participantAgentIds);
    await db.project.update({
      where: { id: projectId },
      data: { participantAgentIds: JSON.stringify(ids.filter((id) => id !== agentId)) },
    });
  }
}

export const projectRepo = new PrismaProjectRepository();
