// ─────────────────────────────────────────────────────────
// 数智企业 · 浏览器会话 tRPC Router
// ─────────────────────────────────────────────────────────

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { browserSessionViewer } from "~/server/connectors/browser/browserSessionViewer";

export const browserRouter = createTRPCRouter({
  /** 获取活跃浏览器会话列表 */
  getSessionStatus: protectedProcedure.query(async () => {
    return browserSessionViewer.getActiveSessions();
  }),

  /** 获取指定会话的实时截图 */
  getSnapshot: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      return browserSessionViewer.captureSnapshot(input.sessionId);
    }),

  /** 获取指定会话的操作历史 */
  getSessionHistory: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      return browserSessionViewer.getSessionHistory(input.sessionId);
    }),
});
