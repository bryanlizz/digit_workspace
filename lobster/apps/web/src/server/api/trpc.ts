/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { getServerSession, type Session } from "next-auth";
import { getToken } from "next-auth/jwt";
import superjson from "superjson";
import { ZodError } from "zod";

import { authOptions } from "~/pages/api/auth/[...nextauth]";
import { db } from "~/server/db";
import { DEFAULT_TENANT_ID } from "~/lib/data";
import { env } from "~/env";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 */

interface CreateContextOptions {
  session: Session | null;
  tenantId: string;
}

/**
 * This helper generates the "internals" for a tRPC context. If you need to use it, you can export
 * it from here.
 */
const createInnerTRPCContext = (opts: CreateContextOptions) => {
  const user = opts.session?.user as Record<string, unknown> | undefined;
  return {
    db,
    session: opts.session,
    tenantId: (user?.tenantId as string) ?? opts.tenantId ?? DEFAULT_TENANT_ID,
  };
};

/**
 * This is the actual context you will use in your router. It will be used to process every request
 * that goes through your tRPC endpoint.
 */
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  // 1. Try cookie-based session first
  let session = await getServerSession(opts.req, opts.res, authOptions);

  // 2. Fallback: Bearer token (desktop client)
  if (!session) {
    try {
      const token = await getToken({
        req: opts.req,
        secret: env.NEXTAUTH_SECRET,
        raw: true, // return raw JWT string
      });
      if (token) {
        // getToken returns the raw JWT string when raw:true; verify and decode it
        const jwt = await getToken({
          req: opts.req,
          secret: env.NEXTAUTH_SECRET,
        });
        if (jwt?.sub) {
          // Reconstruct a minimal session from JWT claims
          session = {
            user: {
              id: jwt.sub,
              name: (jwt.name as string) ?? null,
              email: (jwt.email as string) ?? null,
            },
            expires: new Date(Date.now() + 86400000).toISOString(),
          } as Session;
        }
      }
    } catch {
      // Bearer token parsing failed — session remains null
    }
  }

  return createInnerTRPCContext({ session, tenantId: DEFAULT_TENANT_ID });
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Auth middleware — enforces that a valid session exists.
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * Use this for any procedure that requires the user to be logged in.
 * The session is guaranteed to be non-null in the context.
 */
export const protectedProcedure = t.procedure.use(timingMiddleware).use(isAuthed);
