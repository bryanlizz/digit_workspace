// ─────────────────────────────────────────────────────────
// 数智企业 · 员工 tRPC Router
// ─────────────────────────────────────────────────────────

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { employeeRepo } from "~/lib/repository";

export const employeeRouter = createTRPCRouter({
  /** 获取预设员工列表（15个标准角色） */
  getPresets: publicProcedure.query(async () => {
    return employeeRepo.getPresetEmployees();
  }),

  /** 获取员工列表（支持筛选） */
  list: publicProcedure
    .input(
      z
        .object({
          department: z.string().optional(),
          role: z.enum(["ADMIN", "MANAGER", "STAFF", "OBSERVER"]).optional(),
          isActive: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return employeeRepo.findMany(input);
    }),

  /** 获取单个员工详情 */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return employeeRepo.findById(input.id);
    }),

  /** 创建员工 */
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "姓名不能为空").max(50, "姓名不能超过50字"),
        email: z.string().email("邮箱格式不正确").optional(),
        role: z.enum(["ADMIN", "MANAGER", "STAFF", "OBSERVER"]),
        department: z.string().optional(),
        title: z.string().optional(),
        permissionBm: z.number().int().min(1).max(31).default(1),
      })
    )
    .mutation(async ({ input }) => {
      return employeeRepo.create(input);
    }),

  /** 更新员工信息 */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(50).optional(),
        role: z.enum(["ADMIN", "MANAGER", "STAFF", "OBSERVER"]).optional(),
        department: z.string().optional(),
        title: z.string().optional(),
        permissionBm: z.number().int().min(1).max(31).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return employeeRepo.update(id, data);
    }),

  /** 删除员工 */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await employeeRepo.delete(input.id);
      return { success: true };
    }),

  /** 按部门分组统计 */
  getDepartmentStats: publicProcedure.query(async () => {
    const employees = await employeeRepo.findMany();
    const stats = new Map<string, number>();
    employees.forEach((emp) => {
      const dept = emp.department ?? "未分配";
      stats.set(dept, (stats.get(dept) ?? 0) + 1);
    });
    return Array.from(stats, ([department, count]) => ({ department, count }));
  }),
});
