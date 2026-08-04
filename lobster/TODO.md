# 数智企业 TODO

## SaaS 落地计划

当前状态：SaaS 骨架已搭建，但缺少真正可上线的核心能力。

### P0 — 必须做

1. **真实认证**
   - 接入 NextAuth / Auth.js，替换当前 localStorage + 硬编码用户
   - 实现服务端 session 校验，tRPC procedure 加 auth guard
   - 支持邮箱/手机号注册登录

2. **租户隔离运行时**
   - 从请求中解析 tenantId（header / subdomain / token claim）
   - 所有数据访问加租户过滤，替换全局 `DEFAULT_TENANT_ID`
   - tRPC context 注入 tenant，repository 层统一 where 条件

3. **Mock Repo → Prisma 真实持久化**
   - agent、employee、project、audit 四个 mock repo 切到 Prisma
   - 数据库从 SQLite 切 PostgreSQL（多租户需要）

### P1 — 上线前必须

4. **计费闭环**
   - 接入 Stripe（订阅 + 用量计费）
   - webhook 处理支付状态变更
   - 套餐门控：按 plan 限制 agent 数量、AI 调用量、存储

5. **部署与运维**
   - CI/CD pipeline（GitHub Actions / 其他）
   - 容器化部署支持水平扩展
   - 环境变量管理、secrets rotation

### P2 — 增强

6. **租户级限流与计量**
   - 按租户的 API 限流
   - AI token 用量统计与账单
   - 用量 dashboard

7. **安全加固**
   - RBAC 权限模型
   - API key 管理
   - 审计日志持久化（当前 mock）

---

## 任务/审批引擎统一（已有 Plan）

- 状态源收敛到 taskRepo + approvalService + taskExecutor
- 旧入口保留薄兼容层
- 详见 plan: harmonic-dazzling-tower.md

## 知识库流水线闭环（已有 Plan）

- ingestion → retrieval → graph 最小闭环
- 检索入口收口
- 详见 plan: harmonic-dazzling-tower.md

## 其他待办

- Connector 执行稳定性（大部分已修复，IMAP/SMTP 仍为 mock 实现）
- 离职编排（权限回收、任务迁移）
- 员工广场 UI 完善
