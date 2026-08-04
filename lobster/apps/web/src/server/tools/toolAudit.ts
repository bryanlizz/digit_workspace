// ─────────────────────────────────────────────────────────
// 数智企业 · Tool 审计钩子
// ─────────────────────────────────────────────────────────

import type { ToolDefinition, ToolCallResult, ToolCallContext, IToolExecutor } from "./types";
import { auditRepo } from "~/lib/repository";

const SENSITIVE_KEYS = ["password", "token", "secret", "key", "apiKey", "api_key", "access_token", "refresh_token"];

/**
 * 记录 Tool 调用审计日志
 */
export async function logToolCall(
  tool: ToolDefinition,
  params: Record<string, unknown>,
  result: ToolCallResult,
  context: ToolCallContext
): Promise<void> {
  const sanitizedParams = sanitizeValue(params) as Record<string, unknown>;

  try {
    await auditRepo.log({
      tenantId: context.tenantId,
      agentId: context.agentId,
      action: result.success ? "TOOL_EXECUTED" : "TOOL_FAILED",
      permissionLevel: tool.requiredLevel,
      detail: {
        toolId: tool.id,
        toolName: tool.name,
        systemType: tool.systemType,
        params: sanitizedParams,
        result: {
          success: result.success,
          error: result.error,
          externalRecordId: result.externalRecordId,
          executionTimeMs: result.executionTimeMs,
          artifacts: result.artifacts ?? [],
          externalRecords: result.externalRecords ?? [],
          screenshots: result.screenshots ?? [],
        },
        context: {
          taskId: context.taskId,
          caller: context.caller,
          approval: context.approval,
          projectId: context.projectId,
        },
      },
    });
  } catch (err) {
    console.error("[ToolAudit] 记录审计日志失败:", err);
  }
}

/**
 * 敏感参数脱敏
 */
function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = "***REDACTED***";
      continue;
    }

    sanitized[key] = sanitizeValue(nestedValue);
  }

  return sanitized;
}

/**
 * 包装 Tool Executor，统一保留类型和验证接口
 */
export function withAudit(
  executor: (
    tool: ToolDefinition,
    params: Record<string, unknown>,
    context: ToolCallContext
  ) => Promise<ToolCallResult>
): IToolExecutor {
  return {
    async execute(
      tool: ToolDefinition,
      params: Record<string, unknown>,
      context: ToolCallContext
    ): Promise<ToolCallResult> {
      return executor(tool, params, context);
    },

    validate() {
      return true;
    },
  };
}
