// ─────────────────────────────────────────────────────────
// 数智企业 · 凭证（Credential）tRPC Router
// ─────────────────────────────────────────────────────────

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { vaultService } from "~/server/vault";

export const credentialRouter = createTRPCRouter({
  /** 获取凭证列表（不包含明文） */
  list: protectedProcedure
    .input(
      z
        .object({
          tenantId: z.string().optional(),
          systemType: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tid = input?.tenantId ?? ctx.tenantId;
      return vaultService.listCredentials(tid);
    }),

  /** 获取单个凭证（不包含明文） */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return vaultService.getCredential(input.id);
    }),

  /** 创建凭证 */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "名称不能为空").max(100),
        type: z.enum(["api_key", "password", "oauth", "cookie"]),
        systemType: z.string().min(1),
        credentialData: z.string().min(1, "凭证数据不能为空"),
        ownerId: z.string().optional(),
        agentIds: z.array(z.string()).default([]),
        expiresAt: z.string().optional(), // ISO 日期字符串
        refreshToken: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return vaultService.createCredential({
        tenantId: ctx.tenantId,
        name: input.name,
        type: input.type,
        systemType: input.systemType,
        credentialData: input.credentialData,
        ownerId: input.ownerId,
        agentIds: input.agentIds,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        refreshToken: input.refreshToken,
      });
    }),

  /** 更新凭证 */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        credentialData: z.string().optional(),
        ownerId: z.string().optional().nullable(),
        agentIds: z.array(z.string()).optional(),
        expiresAt: z.string().optional().nullable(),
        refreshToken: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return vaultService.updateCredential(id, {
        name: data.name,
        credentialData: data.credentialData,
        ownerId: data.ownerId ?? undefined,
        agentIds: data.agentIds,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        refreshToken: data.refreshToken ?? undefined,
      });
    }),

  /** 删除凭证（软删除） */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return vaultService.deleteCredential(input.id);
    }),

  // 注意：没有 getCredentialData 接口，明文凭证不可通过 API 获取
});