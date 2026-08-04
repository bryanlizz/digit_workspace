import { createTRPCRouter } from "~/server/api/trpc";
import { employeeRouter } from "~/server/api/routers/employee";
import { agentRouter } from "~/server/api/routers/agent";
import { taskRouter } from "~/server/api/routers/task";
import { projectRouter } from "~/server/api/routers/project";
import { auditRouter } from "~/server/api/routers/audit";
import { knowledgeRouter } from "~/server/api/routers/knowledge";
import { memoryRouter } from "~/server/api/routers/memory";
import { graphRouter } from "~/server/api/routers/graph";
import { permissionRouter } from "~/server/api/routers/permission";
import { offboardingRouter } from "~/server/api/routers/offboarding";
import { credentialRouter } from "~/server/api/routers/credential";
import { toolRouter } from "~/server/api/routers/tool";

export const appRouter = createTRPCRouter({
  employee: employeeRouter,
  agent: agentRouter,
  task: taskRouter,
  project: projectRouter,
  audit: auditRouter,
  knowledge: knowledgeRouter,
  memory: memoryRouter,
  graph: graphRouter,
  permission: permissionRouter,
  offboarding: offboardingRouter,
  credential: credentialRouter,
  tool: toolRouter,
});

export type AppRouter = typeof appRouter;
