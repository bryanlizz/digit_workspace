// ─────────────────────────────────────────────────────────
// 数智企业 · Mock 员工仓库
// ─────────────────────────────────────────────────────────

import type {
  EmployeeDTO,
  CreateEmployeeInput,
  EmployeeFilter,
  PresetEmployeeDTO,
} from "@lobster/types";
import type { IEmployeeRepository } from "../types";
import { PRESET_EMPLOYEES, DEFAULT_TENANT_ID, DEFAULT_EMPLOYEE_ID } from "../../data";

export class MockEmployeeRepository implements IEmployeeRepository {
  private employees: Map<string, EmployeeDTO>;
  private presets: Map<string, PresetEmployeeDTO>;

  constructor() {
    this.employees = new Map();
    this.presets = new Map();

    // 初始化默认老板
    this.employees.set(DEFAULT_EMPLOYEE_ID, {
      id: DEFAULT_EMPLOYEE_ID,
      tenantId: DEFAULT_TENANT_ID,
      name: "王老板",
      email: "boss@lobster.com",
      role: "ADMIN",
      department: "总裁办",
      title: "创始人兼CEO",
      permissionBm: 31, // 全部权限 L1-L5
      avatar: null,
      isActive: true,
      agentCount: 15,
      createdAt: new Date("2026-01-01").toISOString(),
      updatedAt: new Date("2026-06-01").toISOString(),
    });

    // 初始化预设员工映射
    PRESET_EMPLOYEES.forEach((emp) => {
      this.presets.set(emp.id, { ...emp, hasActiveAgent: true });
    });
  }

  async findById(id: string): Promise<EmployeeDTO | null> {
    return this.employees.get(id) ?? null;
  }

  async findMany(filter?: EmployeeFilter): Promise<EmployeeDTO[]> {
    let result = Array.from(this.employees.values());
    if (filter) {
      if (filter.department) {
        result = result.filter((e) => e.department === filter.department);
      }
      if (filter.role) {
        result = result.filter((e) => e.role === filter.role);
      }
      if (filter.isActive !== undefined) {
        result = result.filter((e) => e.isActive === filter.isActive);
      }
    }
    return result;
  }

  async create(data: CreateEmployeeInput): Promise<EmployeeDTO> {
    const id = crypto.randomUUID();
    const employee: EmployeeDTO = {
      id,
      tenantId: DEFAULT_TENANT_ID,
      name: data.name,
      email: data.email ?? null,
      role: data.role,
      department: data.department ?? null,
      title: data.title ?? null,
      permissionBm: data.permissionBm ?? 1,
      avatar: data.avatar ?? null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.employees.set(id, employee);
    console.log(`[MockEmployeeRepo] Created employee: ${employee.name} (${id})`);
    return employee;
  }

  async update(id: string, data: Partial<CreateEmployeeInput>): Promise<EmployeeDTO> {
    const existing = this.employees.get(id);
    if (!existing) throw new Error(`Employee ${id} not found`);
    const updated: EmployeeDTO = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    } as EmployeeDTO;
    this.employees.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.employees.delete(id);
    console.log(`[MockEmployeeRepo] Deleted employee: ${id}`);
  }

  async count(filter?: EmployeeFilter): Promise<number> {
    const result = await this.findMany(filter);
    return result.length;
  }

  async findByEmail(email: string): Promise<EmployeeDTO | null> {
    return Array.from(this.employees.values()).find((e) => e.email === email) ?? null;
  }

  async findByTenant(tenantId: string): Promise<EmployeeDTO[]> {
    return Array.from(this.employees.values()).filter((e) => e.tenantId === tenantId);
  }

  async findByDepartment(department: string): Promise<EmployeeDTO[]> {
    return Array.from(this.employees.values()).filter((e) => e.department === department);
  }

  async getPresetEmployees(): Promise<PresetEmployeeDTO[]> {
    return Array.from(this.presets.values());
  }
}

/** Singleton */
export const employeeRepo = new MockEmployeeRepository();
