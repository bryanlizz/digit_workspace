// ─────────────────────────────────────────────────────────
// 数智企业 · Mock 项目仓库
// ─────────────────────────────────────────────────────────

import type {
  ProjectDTO,
  ProjectDetailDTO,
  CreateProjectInput,
  ProjectFilter,
} from "@lobster/types";
import type { IProjectRepository } from "../types";
import { DEFAULT_TENANT_ID } from "../../data";

export class MockProjectRepository implements IProjectRepository {
  private projects: Map<string, ProjectDTO>;

  constructor() {
    this.projects = new Map();

    const sampleProjects: ProjectDTO[] = [
      {
        id: "proj-001",
        tenantId: DEFAULT_TENANT_ID,
        name: "Q3 战略规划",
        description: "2026年第三季度战略规划项目",
        status: "ACTIVE",
        participantAgentCount: 3,
        participantEmployeeCount: 1,
        taskCount: 2,
        taskStatusCounts: { IN_PROGRESS: 1, AWAITING_APPROVAL: 1 },
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "proj-002",
        tenantId: DEFAULT_TENANT_ID,
        name: "KA 客户续约",
        description: "某大型 KA 客户的年度续约项目",
        status: "ACTIVE",
        participantAgentCount: 2,
        participantEmployeeCount: 1,
        taskCount: 1,
        taskStatusCounts: { DONE: 1 },
        createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "proj-003",
        tenantId: DEFAULT_TENANT_ID,
        name: "新产品孵化",
        description: "基于 AI 的数据分析新产品探索",
        status: "ACTIVE",
        participantAgentCount: 4,
        participantEmployeeCount: 1,
        taskCount: 0,
        taskStatusCounts: {},
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ];

    sampleProjects.forEach((p) => this.projects.set(p.id, p));
  }

  async findById(id: string): Promise<ProjectDTO | null> {
    return this.projects.get(id) ?? null;
  }

  async getByIdWithDetails(id: string): Promise<ProjectDetailDTO | null> {
    const project = this.projects.get(id);
    if (!project) return null;

    return {
      ...project,
      participantAgentIds: ["agent-market-analyst", "agent-competitive-intel", "agent-strategist"].slice(0, project.participantAgentCount),
      participantEmployeeIds: ["admin-boss"],
      tasks: [],
    } as ProjectDetailDTO;
  }

  async findMany(filter?: ProjectFilter): Promise<ProjectDTO[]> {
    let result = Array.from(this.projects.values());
    if (filter?.status) {
      result = result.filter((p) => p.status === filter.status);
    }
    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async create(data: CreateProjectInput): Promise<ProjectDTO> {
    const id = `proj-${crypto.randomUUID().slice(0, 6)}`;
    const project: ProjectDTO = {
      id,
      tenantId: DEFAULT_TENANT_ID,
      name: data.name,
      description: data.description ?? null,
      status: "ACTIVE",
      participantAgentCount: data.participantAgentIds?.length ?? 0,
      participantEmployeeCount: data.participantEmployeeIds?.length ?? 0,
      taskCount: 0,
      taskStatusCounts: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(id, project);
    return project;
  }

  async update(id: string, data: Partial<CreateProjectInput>): Promise<ProjectDTO> {
    const existing = this.projects.get(id);
    if (!existing) throw new Error(`Project ${id} not found`);
    const updated: ProjectDTO = {
      ...existing,
      ...data,
      participantAgentCount: data.participantAgentIds?.length ?? existing.participantAgentCount,
      participantEmployeeCount: data.participantEmployeeIds?.length ?? existing.participantEmployeeCount,
      updatedAt: new Date().toISOString(),
    } as ProjectDTO;
    this.projects.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.projects.delete(id);
  }

  async count(filter?: ProjectFilter): Promise<number> {
    const result = await this.findMany(filter);
    return result.length;
  }

  async findByTenant(tenantId: string): Promise<ProjectDTO[]> {
    return Array.from(this.projects.values()).filter((p) => p.tenantId === tenantId);
  }

  async addParticipant(projectId: string, agentId: string): Promise<void> {
    console.log(`[MockProjectRepo] Added agent ${agentId} to project ${projectId}`);
  }

  async removeParticipant(projectId: string, agentId: string): Promise<void> {
    console.log(`[MockProjectRepo] Removed agent ${agentId} from project ${projectId}`);
  }
}

/** Singleton */
export const projectRepo = new MockProjectRepository();
