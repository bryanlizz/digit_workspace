import { env } from "~/env";
import { PrismaClient } from "@lobster/db";
import path from "path";

function resolveDbUrl(): string {
  const url = env.DATABASE_URL;
  // Resolve relative file: paths to absolute (fixes API route CWD mismatch)
  if (url.startsWith("file:") && !url.startsWith("file:/")) {
    const relativePath = url.slice(5); // remove "file:"
    const absolutePath = path.resolve(relativePath);
    return "file:" + absolutePath;
  }
  return url;
}

const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: { db: { url: resolveDbUrl() } },
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
