// ─────────────────────────────────────────────────────────
// 数智企业 · 知识库 tRPC Router
// ─────────────────────────────────────────────────────────

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { knowledgeRepo } from "~/lib/repository";
import { knowledgePipeline } from "~/server/knowledge/knowledgePipeline";
import { ragService } from "~/server/knowledge/ragService";

export const knowledgeRouter = createTRPCRouter({
  /** 知识检索（含权限过滤） */
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1, "搜索关键词不能为空"),
        userPermissionBm: z.number().int().default(1),
        department: z.string().optional(),
        limit: z.number().int().min(1).max(20).default(5),
      })
    )
    .query(async ({ input }) => {
      return ragService.search(input);
    }),

  /** 获取知识库文档列表 */
  list: publicProcedure
    .input(
      z
        .object({
          searchText: z.string().optional(),
          department: z.string().optional(),
          tenantId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return knowledgeRepo.findMany(input);
    }),

  /** 获取文档详情 */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return knowledgeRepo.findById(input.id);
    }),

  /** 上传知识文档（使用处理管道：切片+向量化） */
  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1, "文档标题不能为空"),
        content: z.string().min(1, "文档内容不能为空"),
        permissionTags: z.array(z.string()).default(["L1"]),
        departmentScope: z.array(z.string()).default(["ALL"]),
        fileType: z.string().optional(),
        fileSize: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await knowledgePipeline.processDocument(
        "tenant-default",
        input.title,
        input.content,
        {
          permissionTags: input.permissionTags,
          departmentScope: input.departmentScope,
          fileType: input.fileType,
          fileSize: input.fileSize,
        }
      );
      return result;
    }),

  /** RAG 问答 */
  answer: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        userPermissionBm: z.number().int().default(1),
        department: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return ragService.answer(input);
    }),

  /** 删除文档 */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await knowledgeRepo.delete(input.id);
      return { success: true };
    }),

  /** 知识库统计 */
  getStats: publicProcedure
    .input(z.object({ tenantId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return knowledgeRepo.getStats(input?.tenantId ?? "tenant-default");
    }),
});
