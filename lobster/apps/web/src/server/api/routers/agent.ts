// ─────────────────────────────────────────────────────────
// 数智企业 · Agent tRPC Router
// ─────────────────────────────────────────────────────────

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { agentRepo } from "~/lib/repository";
import { DEFAULT_AGENTS } from "~/lib/data/agents";
import { aiGateway } from "~/server/gateway/aiGateway";

const agentStatusEnum = z.enum(["IDLE", "WORKING", "BLOCKED", "AWAITING_APPROVAL", "DONE"]);
const agentTypeEnum = z.enum(["DIGITAL_TWIN", "PURE_AGENT"]);

export const agentRouter = createTRPCRouter({
  /** 获取预设 Agent 列表（从 15 个预设员工构建） */
  getPresets: publicProcedure.query(async () => {
    return DEFAULT_AGENTS.map((a) => ({
      id: a.id,
      name: a.name,
      presetRoleId: a.presetRoleId,
      skillTags: a.skillTags,
      permissionBm: a.permissionBm,
      status: a.status,
      coreMemory: a.coreMemory,
    }));
  }),

  /** 获取 Agent 列表（支持筛选） */
  list: publicProcedure
    .input(
      z
        .object({
          status: agentStatusEnum.optional(),
          ownerId: z.string().optional(),
          type: agentTypeEnum.optional(),
          isActive: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return agentRepo.findMany(input);
    }),

  /** 获取单个 Agent 详情（含核心记忆） */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return agentRepo.findById(input.id);
    }),

  /** 创建 Agent */
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "名称不能为空"),
        type: agentTypeEnum.default("DIGITAL_TWIN"),
        ownerId: z.string(),
        presetRoleId: z.string().optional(),
        skillTags: z.array(z.string()).default([]),
        permissionBm: z.number().int().min(1).max(31).default(1),
        roleTitle: z.string().optional(),
        rolePersonality: z.string().optional(),
        roleBoundaries: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return agentRepo.create({
        name: input.name,
        type: input.type,
        ownerId: input.ownerId,
        presetRoleId: input.presetRoleId,
        skillTags: input.skillTags,
        permissionBm: input.permissionBm,
        coreMemory: input.roleTitle
          ? {
              roleDefinition: {
                title: input.roleTitle,
                skills: input.skillTags,
                personality: input.rolePersonality ?? "专业可靠",
                boundaries: input.roleBoundaries ?? "遵守最小权限原则",
              },
            }
          : undefined,
      });
    }),

  /** 更新 Agent（状态、技能等） */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        status: agentStatusEnum.optional(),
        skillTags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return agentRepo.update(id, data);
    }),

  /** 获取 AI 网关状态 */
  getAIGatewayStatus: publicProcedure.query(async () => {
    return {
      routing: aiGateway.getRoutingStatus(),
      health: aiGateway.getHealthStatus(),
    };
  }),

  /** 获取 Agent 核心记忆 */
  getCoreMemory: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ input }) => {
      return agentRepo.getCoreMemory(input.agentId);
    }),

  /** 获取 Agent 长期记忆列表 */
  getMemories: publicProcedure
    .input(
      z.object({
        agentId: z.string(),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      return agentRepo.findRelatedMemories(input.agentId, "", input.limit);
    }),

  /** 获取 Agent 成长曲线 */
  getGrowthCurve: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ input }) => {
      return agentRepo.getGrowthCurve(input.agentId);
    }),

  /** 按 Owner 获取 Agent */
  findByOwner: publicProcedure
    .input(z.object({ ownerId: z.string() }))
    .query(async ({ input }) => {
      return agentRepo.findByOwner(input.ownerId);
    }),
});
