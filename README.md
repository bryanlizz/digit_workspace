# 数智企业（lobster）

企业级 Agent（数字员工）操作平台。让企业创建、配置和管理 AI Agent，使其在**权限、审批、审计、记忆、凭证与部署边界**内，真实操作外部系统（飞书、Boss 直聘、CRM、邮件、短信等），完成招聘、销售、客服等业务闭环。

> 代码名 `lobster`。支持 SaaS 多租户与私有化部署。

## 技术栈

| 层 | 技术 |
|------|------|
| 构建 | [Turborepo](https://turbo.build) + [pnpm](https://pnpm.io) workspaces |
| 前端 | [Next.js 15](https://nextjs.org) · React 19 · [Tailwind CSS 4](https://tailwindcss.com) · [Vite 6](https://vitejs.dev)（桌面端） |
| 类型安全 API | [tRPC 11](https://trpc.io) · [Zod](https://zod.dev) |
| 认证 | [NextAuth 4](https://next-auth.js.org)（Credentials + LDAP + SSO/OIDC） |
| 数据 | [Prisma 6](https://prisma.io)（SQLite 开发 → PostgreSQL 生产） |
| 状态 | [Zustand](https://zustand-demo.pmnd.rs) |
| 其他 | Three.js（3D 办公室）· Playwright（浏览器自动化）· Stripe（计费） |

## 目录结构

```
.
├── apps/                    # 四个端
│   ├── web/                 # 主应用 · 办公客户端（端口 3000）
│   ├── admin/               # 管理控制台（端口 3001）
│   ├── enterprise/          # 企业端（端口 3002）
│   └── desktop/             # 桌面端（Vite，端口 3003）
├── packages/                # 共享包
│   ├── api/                 # tRPC 路由与中间件
│   ├── db/                  # Prisma schema + client
│   ├── types/               # 共享类型定义
│   └── ui/                  # 共享 UI 组件
├── doc/                     # 产品与技术文档（PRD、缺口分析、开发计划）
├── Dockerfile               # 多阶段构建（含 Playwright Chromium）
├── docker-compose.yml       # 生产拓扑（Postgres + Redis + app + worker）
├── turbo.json               # Turborepo 任务编排
└── pnpm-workspace.yaml
```

## 四个端

| 端 | 端口 | 说明 |
|------|------|------|
| **web** | 3000 | 主应用/办公客户端：员工、任务、协作、知识库、技能广场、安全、进化 |
| **admin** | 3001 | 管理控制台：审计、计费、连接器、部署、网关、权限、工具运行时 |
| **enterprise** | 3002 | 企业端：Agent、审批、Bad Case、浏览器自动化、凭证、知识、工具 |
| **desktop** | 3003 | 桌面端（Vite）：协作、知识、设置、任务 |

## 快速开始

环境要求：Node.js ≥ 20，pnpm 9。

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env           # 填入 DATABASE_URL / NEXTAUTH_SECRET 等
# 各端私有变量：apps/web/.env、apps/admin/.env、packages/db/.env

# 3. 初始化数据库
pnpm db:generate               # prisma generate
pnpm db:push                   # 建表 + 同步 schema
pnpm --filter @lobster/db exec tsx prisma/seed.ts   # 种子数据（可选）

# 4. 启动（四个端同时跑）
pnpm dev                       # turbo dev，并行启动全部 app
```

也可以单独启动某个端：

```bash
pnpm --filter @lobster/web dev          # 主应用
pnpm --filter @lobster/admin dev        # 管理台
pnpm --filter @lobster/enterprise dev   # 企业端
pnpm --filter @lobster/desktop dev      # 桌面端
```

启动后访问：`http://localhost:3000`（web）、`3001`（admin）、`3002`（enterprise）、`3003`（desktop）。

## 常用脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 并行启动所有端（开发） |
| `pnpm build` | 构建所有包与应用 |
| `pnpm typecheck` | 全仓类型检查 |
| `pnpm lint` | 全仓 lint |
| `pnpm db:generate` / `db:push` / `db:studio` | Prisma 生成 / 同步 / 可视化 |

## 环境变量

核心变量见 `.env.example`：

- `DATABASE_URL` — 数据库连接串（开发默认 `file:./db.sqlite`，生产为 PostgreSQL）
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` — 认证
- `AUTH_MODE` — `local` / `sso` / `hybrid`
- `DEPLOYMENT_MODE` — `local` / `private` / `enterprise`
- `AI_ROUTING_MODE` / `AI_DEFAULT_PROVIDER` / `AI_DEFAULT_MODEL` — AI 网关
- `SMTP_*` / `IMAP_*` / `SMS_*` / `FEISHU_*` — 连接器凭证
- `STRIPE_*` — 计费
- `BROWSER_DRIVER` — `fetch` / `playwright`

> 完整说明见 `.env.example` 内注释；新增变量时同步更新 `src/env.js` 的 schema。

## 部署

生产部署使用 Docker Compose（Postgres + Redis + 主应用 + Agent Worker）：

```bash
cp .env.production .env   # 或按需导出 DB_PASSWORD / NEXTAUTH_SECRET 等
docker compose up -d --build
```

## 文档

产品与技术文档在 `doc/` 目录，建议按此顺序阅读：

- `doc/PRD_V2.0.md` — 产品需求文档
- `doc/项目总览与端职责梳理.md` — 项目总览与四端职责
- `doc/缺口全面分析_*.md` — 对照 PRD 的缺口分析
- `doc/开发计划_V2.0.md` — 开发阶段规划
- `doc/README.md` — 文档索引导航

## License

私有仓库，保留所有权利。
