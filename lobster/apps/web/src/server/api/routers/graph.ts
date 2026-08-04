import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { graphExtractor } from "~/server/knowledge/graphExtractor";
import { DEFAULT_TENANT_ID } from "~/lib/data";

export const graphRouter = createTRPCRouter({
  getGraph: publicProcedure
    .input(z.object({ entityType: z.string().optional(), maxNodes: z.number().int().default(50) }).optional())
    .query(async ({ input }) => {
      return graphExtractor.getVisualizationData(DEFAULT_TENANT_ID, input);
    }),

  getEntity: publicProcedure.input(z.object({ entityId: z.string() })).query(async ({ input }) => {
    return db.graphEntity.findUnique({ where: { id: input.entityId } });
  }),

  getEntityRelations: publicProcedure.input(z.object({ entityId: z.string() })).query(async ({ input }) => {
    return db.graphRelation.findMany({
      where: { OR: [{ sourceId: input.entityId }, { targetId: input.entityId }] },
      include: { source: true, target: true },
    });
  }),
});
