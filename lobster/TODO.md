# 数智企业 TODO

> 最后更新：2026-08-08（交叉验证后同步）

## SaaS 落地计划

当前状态：核心骨架已完整，仅剩基础设施层和上线前置项。

### P0 — 必须做（全部 ✅ 已完成）

1. **真实认证** ✅
   - 已接入 NextAuth（Credentials + LDAP + SSO/OIDC），`[...nextauth].ts` 完整实现
   - JWT session + tenantId 注入 + tRPC `protectedProcedure` auth guard
   - 支持邮箱/手机号注册登录

2. **租户隔离运行时** ✅
   - 从 JWT token 解析 tenantId
   - 所有数据访问加租户过滤，`DEFAULT_TENANT_ID` 已消除
   - tRPC context 注入 tenant

3. **Mock Repo → Prisma 真实持久化** ✅
   - agent、employee、project、audit 四个 mock repo 全部切换到 Prisma
   - WarRoomMessage 等扩展模型已持久化

### P1 — 上线前必须（部分 🔶）

4. **计费闭环** 🔶
   - Stripe 骨架已搭建：webhook handler + billingService + tRPC router + admin 页面
   - 待：真实 Stripe 账号 + 密钥激活

5. **部署与运维** 🔶
   - Dockerfile ✅（多阶段构建 + Chromium for Playwright）
   - 待：CI/CD pipeline（GitHub Actions），K8s Helm Chart

### P2 — 增强（部分完成）

6. **租户级限流与计量** ⚠️
   - AI 网关 RPM 限流已实现（`aiGateway.ts` `rateLimit` + `isRateLimited()`）
   - 待：按租户的 API 限流、AI token 用量统计与账单、用量 dashboard

7. **安全加固** ✅
   - RBAC 权限模型（5 级 permission bitmap）
   - API key 管理（AI Gateway）
   - 审计日志持久化（Prisma + hash chain 不可篡改）

---

## 任务/审批引擎统一（已有 Plan）

- 状态源收敛到 taskRepo + approvalService + taskExecutor
- 旧入口保留薄兼容层
- 详见 plan: harmonic-dazzling-tower.md

## 知识库流水线闭环（已有 Plan）

- ingestion → retrieval → graph 最小闭环 ✅（`graphExtractor` 已在 agentRuntime + taskExecutor + knowledgePipeline 三处调用）
- 检索入口收口
- 详见 plan: harmonic-dazzling-tower.md

## 其他待办

- ~~Connector 执行稳定性~~ ✅（IMAP/SMTP 已脱离 mock，SMS 阿里云/腾讯云真实 API，2026-08-06）
- 离职编排（权限回收、任务迁移）
- 员工广场 UI 完善
