import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { memoryService } from "~/server/memory/memoryService";

const memoryFilterSchema = z.object({
  projectId: z.string().nullable().optional(),
  type: z.enum(["success", "failure", "preference", "insight"]).optional(),
  source: z.enum(["auto", "suggested", "manual"]).optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  minImportance: z.number().int().min(1).max(5).optional(),
  maxImportance: z.number().int().min(1).max(5).optional(),
});
export const memoryRouter = createTRPCRouter({
  /** 获取 Agent 的记忆列表（分页） */
  list: publicProcedure
    .input(
      z.object({
        agentId: z.string(),
        type: z.enum(["success", "failure", "preference", "insight"]).optional(),
        limit: z.number().int().default(20),
        offset: z.number().int().default(0),
        filter: memoryFilterSchema.optional(),
      }),
    )
    .query(async ({ input }) => {
      return memoryService.listMemories(input.agentId, input.type, input.limit, input.offset, input.filter ?? {});
    }),

  /** 搜索相似记忆 */
  search: publicProcedure
    .input(
      z.object({
        agentId: z.string(),
        query: z.string().min(1),
        limit: z.number().int().default(5),
        filter: memoryFilterSchema.optional(),
      }),
    )
    .query(async ({ input }) => {
      return memoryService.searchSimilarMemories(input.agentId, input.query, input.limit, input.filter ?? {});
    }),

  /** 手动创建记忆 */
  create: publicProcedure
    .input(
      z.object({
        agentId: z.string(),
        taskTitle: z.string(),
        executionLog: z.string(),
        success: z.boolean(),
        projectId: z.string().nullable().optional(),
        source: z.enum(["auto", "suggested", "manual"]).default("auto"),
      }),
    )
    .mutation(async ({ input }) => {
      return memoryService.createMemory(input.agentId, input.taskTitle, input.executionLog, input.success, input.projectId ?? null, input.source);
    }),
});
