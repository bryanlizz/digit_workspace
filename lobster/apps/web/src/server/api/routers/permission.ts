import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const permissionRouter = createTRPCRouter({
  getRoleOverview: publicProcedure.query(async () => {
    const employees = await db.employee.findMany();
    const grouped = new Map<string, { count: number; names: string[]; permissions: number[] }>();
    employees.forEach((emp: { role: string; name: string; permissionBm: number }) => {
      const existing = grouped.get(emp.role) ?? { count: 0, names: [], permissions: [] };
      existing.count++;
      existing.names.push(emp.name);
      existing.permissions.push(emp.permissionBm);
      grouped.set(emp.role, existing);
    });
    return Array.from(grouped, ([role, data]) => ({
      role,
      count: data.count,
      names: data.names,
      samplePermission: data.permissions[0] ?? 1,
    }));
  }),

  listEmployees: publicProcedure.query(async () => {
    return db.employee.findMany({
      include: { agents: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
  }),

  updatePermission: publicProcedure
    .input(z.object({ employeeId: z.string(), permissionBm: z.number().int().min(1).max(31) }))
    .mutation(async ({ input }) => {
      const employee = await db.employee.update({
        where: { id: input.employeeId },
        data: { permissionBm: input.permissionBm },
      });
      await db.auditLog.create({
        data: {
          tenantId: "tenant-default",
          action: "PERMISSION_UPDATED",
          permissionLevel: 5,
          detail: { targetId: input.employeeId, newPermissionBm: input.permissionBm },
        },
      });
      return employee;
    }),
});
