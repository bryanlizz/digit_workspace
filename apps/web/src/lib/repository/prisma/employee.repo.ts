// ─────────────────────────────────────────────────────────
// 数智企业 · Prisma 员工仓库
// ─────────────────────────────────────────────────────────

import { db } from "~/server/db";
import type { Prisma } from "@lobster/db";
import type {
  EmployeeDTO,
  CreateEmployeeInput,
  EmployeeFilter,
  PresetEmployeeDTO,
} from "@lobster/types";
import type { IEmployeeRepository } from "../types";
import { PRESET_EMPLOYEES, DEFAULT_TENANT_ID } from "~/lib/data";

const employeeSelect = {
  id: true, tenantId: true, name: true, email: true, role: true,
  department: true, title: true, permissionBm: true, avatar: true,
  isActive: true, createdAt: true, updatedAt: true,
  _count: { select: { agents: true } },
} as const;

type EmployeeWithCount = Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>;

function toEmployeeDTO(emp: EmployeeWithCount): EmployeeDTO {
  return {
    id: emp.id,
    tenantId: emp.tenantId,
    name: emp.name,
    email: emp.email ?? null,
    role: emp.role as EmployeeDTO["role"],
    department: emp.department ?? null,
    title: emp.title ?? null,
    permissionBm: emp.permissionBm,
    avatar: emp.avatar ?? null,
    isActive: emp.isActive,
    agentCount: emp._count.agents,
    createdAt: emp.createdAt.toISOString(),
    updatedAt: emp.updatedAt.toISOString(),
  };
}

export class PrismaEmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<EmployeeDTO | null> {
    const emp = await db.employee.findUnique({ where: { id }, select: employeeSelect });
    return emp ? toEmployeeDTO(emp) : null;
  }

  async findMany(filter?: EmployeeFilter): Promise<EmployeeDTO[]> {
    const employees = await db.employee.findMany({
      where: {
        tenantId: filter?.tenantId ?? DEFAULT_TENANT_ID,
        ...(filter?.department ? { department: filter.department } : {}),
        ...(filter?.role ? { role: filter.role } : {}),
        ...(filter?.isActive !== undefined ? { isActive: filter.isActive } : {}),
      },
      select: employeeSelect,
      orderBy: { createdAt: "asc" },
    });
    return employees.map(toEmployeeDTO);
  }

  async create(data: CreateEmployeeInput): Promise<EmployeeDTO> {
    const emp = await db.employee.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        name: data.name,
        email: data.email ?? null,
        role: data.role,
        department: data.department ?? null,
        title: data.title ?? null,
        permissionBm: data.permissionBm ?? 1,
        avatar: data.avatar ?? null,
        isActive: true,
      },
      select: employeeSelect,
    });
    return toEmployeeDTO(emp);
  }

  async update(id: string, data: Partial<CreateEmployeeInput>): Promise<EmployeeDTO> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.permissionBm !== undefined) updateData.permissionBm = data.permissionBm;

    const emp = await db.employee.update({
      where: { id },
      data: updateData,
      select: employeeSelect,
    });
    return toEmployeeDTO(emp);
  }

  async delete(id: string): Promise<void> {
    await db.employee.delete({ where: { id } });
  }

  async count(filter?: EmployeeFilter): Promise<number> {
    return db.employee.count({
      where: {
        tenantId: filter?.tenantId ?? DEFAULT_TENANT_ID,
        ...(filter?.department ? { department: filter.department } : {}),
        ...(filter?.role ? { role: filter.role } : {}),
        ...(filter?.isActive !== undefined ? { isActive: filter.isActive } : {}),
      },
    });
  }

  async findByEmail(email: string): Promise<EmployeeDTO | null> {
    const emp = await db.employee.findUnique({ where: { email }, select: employeeSelect });
    return emp ? toEmployeeDTO(emp) : null;
  }

  async findByTenant(tenantId: string): Promise<EmployeeDTO[]> {
    return this.findMany({ tenantId });
  }

  async findByDepartment(department: string): Promise<EmployeeDTO[]> {
    return this.findMany({ department });
  }

  async getPresetEmployees(): Promise<PresetEmployeeDTO[]> {
    const activeAgents = await db.agent.findMany({
      where: { isActive: true },
      select: { presetRoleId: true },
    });
    const activePresetIds = new Set(activeAgents.map((a) => a.presetRoleId).filter(Boolean));

    return PRESET_EMPLOYEES.map((preset) => ({
      ...preset,
      hasActiveAgent: activePresetIds.has(preset.id),
    }));
  }
}

export const employeeRepo = new PrismaEmployeeRepository();
