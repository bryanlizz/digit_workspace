import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { offboardingService } from "~/server/employee/offboardingService";

export const offboardingRouter = createTRPCRouter({
  getPlan: publicProcedure
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ input }) => offboardingService.createPlan(input.employeeId)),

  freeze: publicProcedure
    .input(z.object({ employeeId: z.string() }))
    .mutation(async ({ input }) => {
      await offboardingService.freeze(input.employeeId);
      return { success: true };
    }),

  transfer: publicProcedure
    .input(z.object({ employeeId: z.string(), targetId: z.string() }))
    .mutation(async ({ input }) => {
      await offboardingService.transfer(input.employeeId, input.targetId);
      return { success: true };
    }),

  getTargets: publicProcedure
    .input(z.object({ excludeId: z.string() }))
    .query(async ({ input }) => offboardingService.getTransferTargets(input.excludeId)),
});
