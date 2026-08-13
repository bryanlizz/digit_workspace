# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────
# 龙虾智工 · 多阶段 Docker 构建
# ─────────────────────────────────────────────────────────

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat

# ─── 依赖层 ─────────────────────────────────────────────
FROM base AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/

RUN pnpm install --frozen-lockfile

# ─── 构建层 ─────────────────────────────────────────────
FROM deps AS builder
COPY . .
ARG SKIP_ENV_VALIDATION=1
ENV SKIP_ENV_VALIDATION=$SKIP_ENV_VALIDATION

RUN pnpm --filter @lobster/db exec prisma generate
RUN pnpm --filter @lobster/web build

# ─── 生产运行层 ─────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

# Install Chromium for Playwright
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/packages/db/generated ./packages/db/generated
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /data/uploads && chown nextjs:nodejs /data /data/uploads
USER nextjs

EXPOSE 3000
CMD ["node", "apps/web/.next/standalone/apps/web/server.js"]
