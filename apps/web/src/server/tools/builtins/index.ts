// ─────────────────────────────────────────────────────────
// 数智企业 · 内置 Tools 注册
// ─────────────────────────────────────────────────────────

import { toolRegistry } from "../toolRegistry";

// 导入并注册内置 Tools
import "./feishu";
import "./feishuApproval";
import "./emailDraft";
import "./smtpConnector";
import "./imapConnector";
import "./smsConnector";

/**
 * 初始化所有内置 Tools
 * 在应用启动时调用
 */
export function registerBuiltInTools() {
  const toolCount = toolRegistry.getAllTools().length;
  console.log(`[ToolRegistry] 已加载 ${toolCount} 个内置 Tool`);
}

// 应用启动时自动初始化
if (typeof window === "undefined") {
  // 在 Next.js 等服务端环境自动注册
  try {
    registerBuiltInTools();
  } catch (error) {
    console.error("[ToolRegistry] 初始化内置 Tool 失败:", error);
  }
}