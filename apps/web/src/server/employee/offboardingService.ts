import { db } from "~/server/db";

export interface OffboardingPlan {
  employeeId: string;
  employeeName: string;
  agents: Array<{ id: string; name: string }>;
  action: "freeze" | "transfer";
  targetEmployeeId?: string;
  createdAt: string;
}

export class OffboardingService {
  async createPlan(employeeId: string): Promise<OffboardingPlan> {
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: { agents: true },
    });
    if (!employee) throw new Error("员工不存在");

    return {
      employeeId,
      employeeName: employee.name,
      agents: employee.agents.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })),
      action: "freeze",
      createdAt: new Date().toISOString(),
    };
  }

  async freeze(employeeId: string): Promise<void> {
    await db.employee.update({
      where: { id: employeeId },
      data: { isActive: false },
    });

    await db.agent.updateMany({
      where: { ownerId: employeeId },
      data: { isActive: false, status: "IDLE" },
    });

    await db.auditLog.create({
      data: {
        tenantId: "tenant-default",
        action: "EMPLOYEE_OFFBOARDED",
        permissionLevel: 5,
        detail: { employeeId, type: "freeze" },
      },
    });
  }

  async transfer(employeeId: string, targetEmployeeId: string): Promise<void> {
    await db.agent.updateMany({
      where: { ownerId: employeeId },
      data: { ownerId: targetEmployeeId },
    });

    await db.employee.update({
      where: { id: employeeId },
      data: { isActive: false },
    });

    await db.auditLog.create({
      data: {
        tenantId: "tenant-default",
        action: "AGENT_TRANSFERRED",
        permissionLevel: 5,
        detail: { from: employeeId, to: targetEmployeeId },
      },
    });
  }

  async getTransferTargets(excludeId: string) {
    return db.employee.findMany({
      where: { id: { not: excludeId }, isActive: true },
      select: { id: true, name: true, department: true, role: true },
    });
  }
}

export const offboardingService = new OffboardingService();
