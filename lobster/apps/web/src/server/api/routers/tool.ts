// ─────────────────────────────────────────────────────────
// 数智企业 · Tool tRPC Router
// ─────────────────────────────────────────────────────────

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { toolRegistry } from "~/server/tools";

export const toolRouter = createTRPCRouter({
  /** 获取所有 Tool */
  list: protectedProcedure
    .input(
      z
        .object({
          systemType: z.string().optional(),
          query: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { systemType, query, limit } = input ?? {};

      let tools = toolRegistry.getAllTools();

      // 按系统过滤
      if (systemType) {
        tools = tools.filter((t) => t.systemType === systemType);
      }

      // 关键词搜索
      if (query) {
        const q = query.toLowerCase();
        tools = tools.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.systemType.toLowerCase().includes(q)
        );
      }

      return tools.slice(0, limit);
    }),

  /** 获取单个 Tool */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const tool = toolRegistry.getTool(input.id);
      return tool ?? null;
    }),

  /** 按系统类型获取 Tools */
  getBySystem: protectedProcedure
    .input(z.object({ systemType: z.string() }))
    .query(async ({ input }) => {
      return toolRegistry.getToolsBySystem(input.systemType);
    }),

  /** 搜索 Tools */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ input }) => {
      return toolRegistry.search(input.query, input.limit);
    }),
});