// ─────────────────────────────────────────────────────────
// 数智企业 · 飞书内置 Tool
// ─────────────────────────────────────────────────────────

import { toolRegistry } from "../toolRegistry";
import { createHttpConnector } from "~/server/connectors";
import { withAudit } from "../toolAudit";
import type { ToolDefinition } from "../types";

// 飞书 API 配置
const FEISHU_CONFIG = {
  baseUrl: "https://open.feishu.cn/open-apis",
  appId: process.env.FEISHU_APP_ID ?? "",
  appSecret: process.env.FEISHU_APP_SECRET ?? "",
};

/**
 * 飞书消息 Tool 定义
 */
const feishuSendMessageTool: ToolDefinition = {
  id: "feishu.send_message",
  name: "发送飞书消息",
  description: "向飞书用户或群组发送消息。支持文本、卡片等消息类型。",
  systemType: "feishu",
  requiredLevel: 4, // L4: 发送外部消息
  requiresApproval: true, // 需要审批
  parameters: [
    {
      name: "receiveIdType",
      type: "string",
      description: "接收者 ID 类型",
      required: true,
      enum: ["open_id", "user_id", "union_id", "email", "chat_id"],
    },
    {
      name: "receiveId",
      type: "string",
      description: "接收者 ID",
      required: true,
    },
    {
      name: "msgType",
      type: "string",
      description: "消息类型",
      required: true,
      enum: ["text", "post", "image", "file", "audio", "media", "sticker", "interactive"],
    },
    {
      name: "content",
      type: "string",
      description: "消息内容（JSON 格式，文本消息内容为 {\"text\":\"...\"}）",
      required: true,
    },
  ],
  outputSchema: {
    type: "object",
    description: "返回消息发送结果，包含消息 ID 和时间戳",
  },
  examples: [
    '发送文本消息: {"receiveIdType": "open_id", "receiveId": "ou_xxx", "msgType": "text", "content": "{\"text\":\"Hello\"}"}',
    '发送卡片消息: {"receiveIdType": "chat_id", "receiveId": "oc_xxx", "msgType": "interactive", "content": "{\"config\":{\"wide_screen_mode\":true},\"elements\":[{\"tag\":\"markdown\",\"content\":\"**bold** text\"}]}"}',
  ],
};

/**
 * 飞书获取 tenant_access_token
 */
async function getTenantAccessToken(): Promise<string | null> {
  if (!FEISHU_CONFIG.appId || !FEISHU_CONFIG.appSecret) {
    console.warn("[Feishu] 缺少 APP_ID 或 APP_SECRET 配置");
    return null;
  }

  try {
    const response = await fetch(`${FEISHU_CONFIG.baseUrl}/auth/v3/tenant_access_token/internal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: FEISHU_CONFIG.appId,
        app_secret: FEISHU_CONFIG.appSecret,
      }),
    });

    const data = await response.json() as { code?: number; tenant_access_token?: string };
    if (data.code === 0 && data.tenant_access_token) {
      return data.tenant_access_token;
    }
    return null;
  } catch (error) {
    console.error("[Feishu] 获取 tenant_access_token 失败:", error);
    return null;
  }
}

/**
 * 飞书消息执行器
 */
const feishuSendMessageExecutor = withAudit(async (tool, params, context) => {
  const p = params as {
    receiveIdType: string;
    receiveId: string;
    msgType: string;
    content: string;
  };

  // 获取 tenant_access_token
  const token = await getTenantAccessToken();
  if (!token) {
    return {
      success: false,
      error: "无法获取飞书访问令牌，请检查 APP_ID 和 APP_SECRET 配置",
      executionTimeMs: 0,
    };
  }

  // 创建 HTTP Connector
  const connector = createHttpConnector({
    baseUrl: FEISHU_CONFIG.baseUrl,
    defaultHeaders: {
      Authorization: `Bearer ${token}`,
    },
    timeout: 10000,
  });

  // 执行业务逻辑
  const toolDefForExec: ToolDefinition = {
    ...tool,
    id: "feishu.send_message",
  };

  return connector.execute(toolDefForExec, {
    method: "POST",
    path: "/im/v1/messages",
    query: {
      receive_id_type: p.receiveIdType,
    },
    body: {
      receive_id: p.receiveId,
      msg_type: p.msgType,
      content: p.content,
    },
  }, context);
});

/**
 * 注册飞书内置 Tools
 */
export function registerFeishuTools() {
  toolRegistry.register(feishuSendMessageTool, feishuSendMessageExecutor);
  console.log("[Feishu] 已注册飞书 Tool:", feishuSendMessageTool.id);
}

// 自动注册（模块加载时）
if (typeof window === "undefined") {
  registerFeishuTools();
}