// ─────────────────────────────────────────────────────────
// 数智企业 · 项目（作战室）tRPC Router
// ─────────────────────────────────────────────────────────

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { projectRepo, warRoomMessageRepo } from "~/lib/repository";

export const projectRouter = createTRPCRouter({
  /** 获取项目列表 */
  list: publicProcedure
    .input(
      z
        .object({
          status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return projectRepo.findMany(input);
    }),

  /** 获取项目详情（含完整信息） */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return projectRepo.getByIdWithDetails(input.id);
    }),

  /** 创建项目（作战室） */
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "项目名称不能为空").max(100),
        description: z.string().max(2000).optional(),
        participantAgentIds: z.array(z.string()).default([]),
        participantEmployeeIds: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      return projectRepo.create(input);
    }),

  /** 更新项目 */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(2000).optional(),
        status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return projectRepo.update(id, data);
    }),

  /** 添加 Agent 到项目 */
  addParticipant: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        agentId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await projectRepo.addParticipant(input.projectId, input.agentId);
      return { success: true };
    }),

  /** 从项目移除 Agent */
  removeParticipant: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        agentId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await projectRepo.removeParticipant(input.projectId, input.agentId);
      return { success: true };
    }),

  // ─── 作战室消息 ───────────────────────────────────────

  /** 获取项目消息列表 */
  getMessages: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return warRoomMessageRepo.findByProject(
        input.projectId,
        input.limit,
        input.offset
      );
    }),

  /** 发送消息 */
  sendMessage: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        senderType: z.enum(["human", "agent", "system"]),
        senderId: z.string(),
        senderName: z.string(),
        avatar: z.string().optional(),
        content: z.string().min(1).max(10000),
        messageType: z.enum(["text", "image", "file", "action"]).default("text"),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return warRoomMessageRepo.create(input);
    }),
});
