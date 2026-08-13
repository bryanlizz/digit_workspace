import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { offboardingService } from "~/server/employee/offboardingService";

export const offboardingRouter = createTRPCRouter({
  getPlan: protectedProcedure
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ input }) => offboardingService.createPlan(input.employeeId)),

  freeze: protectedProcedure
    .input(z.object({ employeeId: z.string() }))
    .mutation(async ({ input }) => {
      await offboardingService.freeze(input.employeeId);
      return { success: true };
    }),

  transfer: protectedProcedure
    .input(z.object({ employeeId: z.string(), targetId: z.string() }))
    .mutation(async ({ input }) => {
      await offboardingService.transfer(input.employeeId, input.targetId);
      return { success: true };
    }),

  getTargets: protectedProcedure
    .input(z.object({ excludeId: z.string() }))
    .query(async ({ input }) => offboardingService.getTransferTargets(input.excludeId)),
});
