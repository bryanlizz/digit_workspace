// ─────────────────────────────────────────────────────────
// 数智企业 · Tool 注册器基础
// ─────────────────────────────────────────────────────────

import type { ToolDefinition, IToolExecutor } from "./types";

/**
 * 基础 Tool Executor（通用实现）
 */
export abstract class BaseToolExecutor implements IToolExecutor {
  abstract execute(
    definition: ToolDefinition,
    params: Record<string, unknown>,
    context: import("./types").ToolCallContext
  ): Promise<import("./types").ToolCallResult>;

  validate(params: unknown, definition: ToolDefinition): boolean {
    if (typeof params !== "object" || params === null) return false;
    const paramObj = params as Record<string, unknown>;

    for (const param of definition.parameters) {
      if (param.required && !(param.name in paramObj)) {
        return false;
      }
      if (param.name in paramObj) {
        const value = paramObj[param.name];
        // 类型检查
        const expectedType = param.type;
        const actualType = typeof value;
        if (expectedType === "number" && actualType !== "number") {
          return false;
        }
        if (expectedType === "boolean" && actualType !== "boolean") {
          return false;
        }
        if (expectedType === "string" && actualType !== "string") {
          return false;
        }
        if (expectedType === "object" && (actualType !== "object" || value === null)) {
          return false;
        }
        if (expectedType === "array" && !Array.isArray(value)) {
          return false;
        }
        // 枚举检查
        if (param.enum && typeof value === "string" && !param.enum.includes(value)) {
          return false;
        }
      }
    }
    return true;
  }
}