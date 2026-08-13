// ─────────────────────────────────────────────────────────
// 工具选择器
// 根据子任务选择最合适的工具
// ─────────────────────────────────────────────────────────

import type { SubTask, TaskContext, ToolSelection } from "./types";
import type { ToolDefinition } from "~/server/tools/types";
import { toolRegistry } from "~/server/tools/toolRegistry";
import { taskDecomposer } from "./taskDecomposer";

/**
 * 工具选择器
 */
export class ToolSelector {
  /**
   * 根据子任务选择最合适的工具
   */
  async selectTool(
    subTask: SubTask,
    context: TaskContext
  ): Promise<ToolSelection | null> {
    // 1. 如果已经预选了工具，验证并返回
    if (subTask.toolId) {
      const tool = toolRegistry.getTool(subTask.toolId);
      if (tool) {
        return {
          tool,
          confidence: 1.0,
          reasoning: "用户预选的工具",
        };
      }
    }

    // 2. 获取可用工具
    const availableTools = this.getAvailableTools(context);

    if (availableTools.length === 0) {
      return null;
    }

    // 3. 使用任务拆解器的工具选择功能
    const selection = await taskDecomposer.selectTool(subTask, context);

    if (!selection.toolId) {
      return null;
    }

    const tool = toolRegistry.getTool(selection.toolId);
    if (!tool) {
      return null;
    }

    return {
      tool,
      confidence: selection.confidence,
      reasoning: selection.reasoning,
      parameterSuggestions: this.suggestParameters(subTask, tool),
    };
  }

  /**
   * 为子任务生成工具参数建议
   */
  suggestParameters(subTask: SubTask, tool: ToolDefinition): Record<string, unknown> {
    const suggestions: Record<string, unknown> = {};

    // 根据工具类型和子任务描述提取参数
    for (const param of tool.parameters) {
      const paramValue = this.extractParameterValue(subTask.description, param);
      if (paramValue !== undefined) {
        suggestions[param.name] = paramValue;
      }
    }

    return suggestions;
  }

  /**
   * 从子任务描述中提取参数值
   * 这是一个简化实现，实际可能需要更复杂的 NLP 处理
   */
  private extractParameterValue(
    description: string,
    param: ToolDefinition["parameters"][0]
  ): unknown {
    const desc = description.toLowerCase();

    // 常见参数模式匹配
    const patterns: Record<string, { regex: RegExp; transform?: (match: string) => unknown }[]> = {
      email: [
        { regex: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/ },
      ],
      sessionId: [
        { regex: /session[_\s]?id[:\s]+([a-zA-Z0-9-]+)/i },
        { regex: /会话[_\s]?id[:\s]+([a-zA-Z0-9-]+)/i },
      ],
      userId: [
        { regex: /user[_\s]?id[:\s]+([a-zA-Z0-9-]+)/i },
        { regex: /用户[_\s]?id[:\s]+([a-zA-Z0-9-]+)/i },
      ],
      message: [
        { regex: /消息[:\s]+["'](.+?)["']/i },
        { regex: /message[:\s]+["'](.+?)["']/i },
      ],
      keyword: [
        { regex: /关键词[:\s]+["']?(.+?)["']?$/i },
        { regex: /keyword[:\s]+["']?(.+?)["']?$/i },
      ],
      city: [
        { regex: /(?:城市|地点|城市[:\s]+)([^，,。\n]+)/i },
      ],
    };

    const paramPatterns = patterns[param.name];
    if (paramPatterns) {
      for (const pattern of paramPatterns) {
        const match = desc.match(pattern.regex);
        if (match) {
          return pattern.transform && match[1] !== undefined ? pattern.transform(match[1]) : match[1];
        }
      }
    }

    return undefined;
  }

  /**
   * 获取可用工具列表
   */
  private getAvailableTools(context: TaskContext): ToolDefinition[] {
    const allTools = toolRegistry.getAllTools();

    return allTools.filter((tool) => {
      // 检查白名单
      if (context.config.allowedTools?.length) {
        if (!context.config.allowedTools.includes(tool.id)) {
          return false;
        }
      }

      // 检查黑名单
      if (context.config.deniedTools?.includes(tool.id)) {
        return false;
      }

      // 检查操作级别
      if (tool.requiredLevel > context.config.maxLevel) {
        return false;
      }

      return true;
    });
  }

  /**
   * 批量选择工具
   */
  async selectTools(
    subTasks: SubTask[],
    context: TaskContext
  ): Promise<Map<string, ToolSelection | null>> {
    const results = new Map<string, ToolSelection | null>();

    for (const subTask of subTasks) {
      results.set(subTask.id, await this.selectTool(subTask, context));
    }

    return results;
  }

  /**
   * 验证工具是否可用
   */
  isToolAvailable(toolId: string, context: TaskContext): boolean {
    const tool = toolRegistry.getTool(toolId);
    if (!tool) return false;

    // 检查操作级别
    if (tool.requiredLevel > context.config.maxLevel) {
      return false;
    }

    // 检查黑名单
    if (context.config.deniedTools?.includes(toolId)) {
      return false;
    }

    return true;
  }

  /**
   * 获取工具的预估执行时间（毫秒）
   */
  estimateExecutionTime(toolId: string): number {
    // 常见工具的执行时间估算
    const timeEstimates: Record<string, number> = {
      "feishu.message": 2000,
      "feishu.approval": 5000,
      "email.send": 3000,
      "email.read": 2000,
      "boss.login": 10000,
      "boss.search": 5000,
      "boss.greet": 3000,
      "boss.resume": 3000,
    };

    return timeEstimates[toolId] ?? 5000;
  }
}

/**
 * 全局工具选择器实例
 */
export const toolSelector = new ToolSelector();