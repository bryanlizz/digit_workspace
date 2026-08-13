import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { graphExtractor } from "~/server/knowledge/graphExtractor";

export const graphRouter = createTRPCRouter({
  getGraph: protectedProcedure
    .input(z.object({ entityType: z.string().optional(), maxNodes: z.number().int().default(50) }).optional())
    .query(async ({ ctx, input }) => {
      return graphExtractor.getVisualizationData(ctx.tenantId, input);
    }),

  getEntity: protectedProcedure.input(z.object({ entityId: z.string() })).query(async ({ input }) => {
    return db.graphEntity.findUnique({ where: { id: input.entityId } });
  }),

  getEntityRelations: protectedProcedure.input(z.object({ entityId: z.string() })).query(async ({ input }) => {
    return db.graphRelation.findMany({
      where: { OR: [{ sourceId: input.entityId }, { targetId: input.entityId }] },
      include: { source: true, target: true },
    });
  }),
});
