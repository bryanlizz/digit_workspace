// ─────────────────────────────────────────────────────────
// 数智企业 · Tool 注册器实现
// ─────────────────────────────────────────────────────────

import type { ToolDefinition, ToolCallResult, ToolCallContext, IToolRegistry, IToolExecutor } from "./types";
import { logToolCall } from "./toolAudit";

/**
 * 内存版 Tool 注册器（V1）
 * 后续可替换为数据库持久化版本
 */
export class InMemoryToolRegistry implements IToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private executors: Map<string, IToolExecutor> = new Map();

  register(definition: ToolDefinition, executor: IToolExecutor): void {
    if (this.tools.has(definition.id)) {
      console.warn(`[ToolRegistry] Tool ${definition.id} 已存在，将被覆盖`);
    }
    this.tools.set(definition.id, definition);
    this.executors.set(definition.id, executor);
    console.log(`[ToolRegistry] 注册 Tool: ${definition.id} (${definition.name})`);
  }

  /** 取消注册 Tool */
  unregister(toolId: string): void {
    this.tools.delete(toolId);
    this.executors.delete(toolId);
    console.log(`[ToolRegistry] 取消注册 Tool: ${toolId}`);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getToolsBySystem(systemType: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(
      (t) => t.systemType === systemType
    );
  }

  getTool(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  getExecutor(id: string): IToolExecutor | undefined {
    return this.executors.get(id);
  }

  search(query: string, limit = 10): ToolDefinition[] {
    const q = query.toLowerCase();
    return Array.from(this.tools.values())
      .filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.systemType.toLowerCase().includes(q)
      )
      .slice(0, limit);
  }

  async execute(
    toolId: string,
    params: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const tool = this.tools.get(toolId);
    const executor = this.executors.get(toolId);

    if (context.signal?.aborted) {
      return {
        success: false,
        error: "任务已取消",
        executionTimeMs: 0,
      };
    }

    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolId} 不存在`,
        executionTimeMs: 0,
      };
    }

    if (!executor) {
      return {
        success: false,
        error: `Tool ${toolId} 的执行器未注册`,
        executionTimeMs: 0,
      };
    }

    // 参数验证
    if (!executor.validate(params, tool)) {
      const result: ToolCallResult = {
        success: false,
        error: `参数验证失败`,
        executionTimeMs: 0,
      };

      await logToolCall(tool, params, result, context);
      return result;
    }

    const startTime = Date.now();
    const startedAt = new Date(startTime);
    try {
      const result = await executor.execute(tool, params, context);
      const normalized: ToolCallResult = {
        ...result,
        startedAt: result.startedAt ?? startedAt,
        completedAt: result.completedAt ?? new Date(),
        executionTimeMs: Date.now() - startTime,
      };

      await logToolCall(tool, params, normalized, context);
      return normalized;
    } catch (error) {
      const result: ToolCallResult = {
        success: false,
        error: error instanceof Error ? error.message : "执行失败",
        startedAt,
        completedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };

      await logToolCall(tool, params, result, context);
      return result;
    }
  }
}

export const toolRegistry = new InMemoryToolRegistry();
