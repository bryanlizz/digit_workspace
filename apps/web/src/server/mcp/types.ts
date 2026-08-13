// ─────────────────────────────────────────────────────────
// 数智企业 · MCP 类型定义
// ─────────────────────────────────────────────────────────

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: "stdio" | "http";
  // stdio
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // http
  url?: string;
  headers?: Record<string, string>;
  // control
  enabled: boolean;
  toolPrefix?: string;
}
