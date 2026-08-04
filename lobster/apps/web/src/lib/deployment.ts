export const deploymentConfig = {
  deploymentMode: process.env.NEXT_PUBLIC_DEPLOYMENT_MODE ?? "local",
  authMode: process.env.NEXT_PUBLIC_AUTH_MODE ?? "local",
  workerUrl: process.env.NEXT_PUBLIC_WORKER_URL ?? "",
};

export const deploymentProfiles = [
  {
    key: "local",
    title: "本地开发",
    detail: "单机运行，使用本地文件数据库与演示账号。",
  },
  {
    key: "private",
    title: "私有化部署",
    detail: "内网容器部署，保留 Worker 与数据库分离的接口。",
  },
  {
    key: "enterprise",
    title: "企业集成",
    detail: "对接 LDAP / AD / SSO，并连接企业存量基础设施。",
  },
] as const;

export const deploymentRuntimeConstraints = {
  local: [
    "默认使用本地文件数据库与演示账号。",
    "Worker 与主站默认同机运行，适合开发和演示。",
  ],
  private: [
    "通过 Docker / Compose 统一交付。",
    "数据库连接与 Worker 地址通过环境变量提供。",
    "优先保留主站与 Worker 的部署边界。",
  ],
  enterprise: [
    "预留 LDAP / AD / SSO 接入位。",
    "数据库与网络边界按企业内网约束配置。",
    "主站与 Worker 可按客户环境分离部署。",
  ],
} as const;
