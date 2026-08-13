// ─────────────────────────────────────────────────────────
// 飞书审批 Connector
// 负责创建、查询、处理飞书审批
// ─────────────────────────────────────────────────────────

import { createHttpConnector } from "~/server/connectors/httpConnector";
import type { ToolDefinition } from "~/server/tools/types";
import { withAudit } from "../toolAudit";

const FEISHU_APPROVAL_BASE_URL = "https://open.feishu.cn/open-apis/approval/v4";

/**
 * 获取 tenant_access_token
 */
async function getTenantAccessToken(): Promise<string | null> {
  const appId = process.env.FEISHU_APP_ID ?? "";
  const appSecret = process.env.FEISHU_APP_SECRET ?? "";

  if (!appId || !appSecret) {
    console.warn("[Feishu Approval] 缺少 APP_ID 或 APP_SECRET 配置");
    return null;
  }

  try {
    const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });

    const data = await response.json() as { code?: number; tenant_access_token?: string };
    if (data.code === 0 && data.tenant_access_token) {
      return data.tenant_access_token;
    }
    return null;
  } catch (error) {
    console.error("[Feishu Approval] 获取 tenant_access_token 失败:", error);
    return null;
  }
}

/**
 * 飞书审批 Tool 定义
 */
export const feishuApprovalTool: ToolDefinition = {
  id: "feishu.create_approval",
  name: "创建飞书审批",
  description: "在飞书中创建一个审批任务，等待审批人处理。适用于需要人工确认的操作。",
  systemType: "feishu",
  requiredLevel: 4, // L4: 发送内部消息/审批
  requiresApproval: false, // 创建审批本身不需要审批
  parameters: [
    {
      name: "approvalCode",
      type: "string",
      description: "审批表单 Code（飞书审批后台配置的表单唯一标识）",
      required: true,
    },
    {
      name: "approvers",
      type: "string",
      description: "审批人 ID 列表，逗号分隔（如: user_id_1,user_id_2）",
      required: true,
    },
    {
      name: "form",
      type: "string",
      description: "表单数据（JSON 数组格式），如: [{\"id\":\"widget_xxx\",\"value\":{\"text\":\"内容\"}}]",
      required: true,
    },
    {
      name: "title",
      type: "string",
      description: "审批标题",
      required: true,
    },
    {
      name: "reason",
      type: "string",
      description: "申请理由",
      required: false,
    },
  ],
  outputSchema: {
    type: "object",
    description: "返回审批实例 ID 和状态",
  },
};

/**
 * 获取审批实例详情
 */
export const feishuGetApprovalInstanceTool: ToolDefinition = {
  id: "feishu.get_approval_instance",
  name: "查询飞书审批详情",
  description: "查询已创建的飞书审批实例的当前状态和审批结果。",
  systemType: "feishu",
  requiredLevel: 1, // L1: 只读查询
  requiresApproval: false,
  parameters: [
    {
      name: "instanceId",
      type: "string",
      description: "审批实例 ID",
      required: true,
    },
  ],
  outputSchema: {
    type: "object",
    description: "返回审批实例详情",
  },
};

/**
 * 处理审批（批准/驳回）
 */
export const feishuProcessApprovalTool: ToolDefinition = {
  id: "feishu.process_approval",
  name: "处理飞书审批",
  description: "对飞书审批进行批准或驳回操作。",
  systemType: "feishu",
  requiredLevel: 4,
  requiresApproval: true, // 处理审批需要审批
  parameters: [
    {
      name: "instanceId",
      type: "string",
      description: "审批实例 ID",
      required: true,
    },
    {
      name: "action",
      type: "string",
      description: "操作类型",
      required: true,
      enum: ["approve", "reject"],
    },
    {
      name: "comment",
      type: "string",
      description: "审批意见",
      required: false,
    },
  ],
  outputSchema: {
    type: "object",
    description: "返回处理结果",
  },
};

/**
 * 创建审批执行器
 */
const createApprovalExecutor = withAudit(async (tool, params, context) => {
  const p = params as {
    approvalCode: string;
    approvers: string;
    form: string;
    title: string;
    reason?: string;
  };

  const token = await getTenantAccessToken();
  if (!token) {
    return {
      success: false,
      error: "无法获取飞书访问令牌",
      executionTimeMs: 0,
    };
  }

  const connector = createHttpConnector({
    baseUrl: FEISHU_APPROVAL_BASE_URL,
    defaultHeaders: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  });

  // 解析审批人列表
  const approverList = p.approvers.split(",").map((id: string) => id.trim()).filter(Boolean);

  return connector.execute(tool, {
    method: "POST",
    path: "/instances",
    body: {
      approval_code: p.approvalCode,
      approvers: approverList.map((userId: string) => ({ user_id: userId })),
      form: JSON.parse(p.form),
      title: p.title,
      reason: p.reason ?? "",
    },
  }, context);
});

/**
 * 获取审批详情执行器
 */
const getApprovalInstanceExecutor = withAudit(async (tool, params, context) => {
  const p = params as { instanceId: string };

  const token = await getTenantAccessToken();
  if (!token) {
    return {
      success: false,
      error: "无法获取飞书访问令牌",
      executionTimeMs: 0,
    };
  }

  const connector = createHttpConnector({
    baseUrl: FEISHU_APPROVAL_BASE_URL,
    defaultHeaders: { Authorization: `Bearer ${token}` },
    timeout: 10000,
  });

  return connector.execute(tool, {
    method: "GET",
    path: `/instances/${p.instanceId}`,
  }, context);
});

/**
 * 处理审批执行器
 */
const processApprovalExecutor = withAudit(async (tool, params, context) => {
  const p = params as {
    instanceId: string;
    action: "approve" | "reject";
    comment?: string;
  };

  const token = await getTenantAccessToken();
  if (!token) {
    return {
      success: false,
      error: "无法获取飞书访问令牌",
      executionTimeMs: 0,
    };
  }

  const connector = createHttpConnector({
    baseUrl: FEISHU_APPROVAL_BASE_URL,
    defaultHeaders: { Authorization: `Bearer ${token}` },
    timeout: 10000,
  });

  return connector.execute(tool, {
    method: "PUT",
    path: `/instances/${p.instanceId}`,
    body: {
      action: p.action === "approve" ? 2 : 3, // 2=批准, 3=驳回
      comment: p.comment ?? "",
    },
  }, context);
});

/**
 * 注册飞书审批 Tools
 */
export function registerFeishuApprovalTools() {
  const { toolRegistry } = require("../toolRegistry");

  toolRegistry.register(feishuApprovalTool, createApprovalExecutor);
  toolRegistry.register(feishuGetApprovalInstanceTool, getApprovalInstanceExecutor);
  toolRegistry.register(feishuProcessApprovalTool, processApprovalExecutor);

  console.log("[Feishu Approval] 已注册审批 Tool:", [
    feishuApprovalTool.id,
    feishuGetApprovalInstanceTool.id,
    feishuProcessApprovalTool.id,
  ]);
}
