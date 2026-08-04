// ─────────────────────────────────────────────────────────
// 任务拆解器
// 使用 LLM 将复杂任务分解为可执行的子任务
// ─────────────────────────────────────────────────────────

import { randomUUID } from "crypto";
import type {
  SubTask,
  TaskContext,
  TaskExecutionResult,
} from "./types";
import type { ToolDefinition } from "~/server/tools/types";
import { toolRegistry } from "~/server/tools/toolRegistry";
import { aiGateway } from "~/server/gateway/aiGateway";

/**
 * 任务拆解提示词模板
 */
const DECOMPOSE_PROMPT_TEMPLATE = `你是一个任务拆解专家。请将以下任务分解为可执行的子任务。

## 任务描述
{taskDescription}

## Agent 信息
- Agent ID: {agentId}
- Agent 名称: {agentName}
- 最大操作级别: L{maxLevel}
- 允许的工具: {allowedTools}

## 项目上下文
{projectContext}

## 拆解要求

1. 每个子任务应该是**原子操作**，即一个子任务只做一件事
2. 识别子任务之间的**依赖关系**（哪些子任务必须先完成才能开始）
3. 为每个子任务预估**操作级别**：
   - L0: 只分析，不执行
   - L1: 只读查询
   - L2: 写入内部系统
   - L3: 发送内部消息
   - L4: 发送外部消息
   - L5: 修改业务数据
   - L6: 关键动作（资金、合同、人事）
4. 判断每个子任务是否需要**人工审批**
5. 如果子任务需要调用工具，尽量**预选工具**

## 输出格式

请以 JSON 格式输出，结构如下：
{
  "subTasks": [
    {
      "id": "step_1",
      "description": "子任务描述",
      "dependsOn": [],
      "estimatedLevel": 1,
      "requiresApproval": false,
      "toolId": "可选的工具ID"
    }
  ],
  "executionOrder": ["step_1", "step_2"],
  "summary": "任务概述"
}

注意：
- 只输出 JSON，不要有其他内容
- estimatedLevel 不能超过 Agent 的 maxLevel
- 如果任务过于简单，可以只有一个子任务`;

/**
 * 工具匹配提示词
 */
const TOOL_MATCH_PROMPT = `你是一个工具匹配专家。请根据子任务描述，从以下可用工具中选择最合适的一个。

## 子任务
{subTaskDescription}

## 可用工具
{availableTools}

## 选择要求

1. 根据工具的名称、描述、参数选择最匹配的
2. 考虑工具的输入输出是否与子任务需求一致
3. 考虑工具的操作级别是否在 Agent 允许范围内

## 输出格式

{
  "toolId": "选择的工具ID",
  "confidence": 0.85,
  "reasoning": "选择理由"
}

如果没有任何工具匹配，返回：
{
  "toolId": null,
  "confidence": 0,
  "reasoning": "没有找到合适的工具"
}`;

/**
 * 任务拆解结果（从 LLM 返回）
 */
interface DecomposeLLMResult {
  subTasks: Array<{
    id: string;
    description: string;
    dependsOn: string[];
    estimatedLevel: number;
    requiresApproval: boolean;
    toolId?: string;
  }>;
  executionOrder: string[];
  summary: string;
}

/**
 * 工具匹配结果
 */
interface ToolMatchResult {
  toolId: string | null;
  confidence: number;
  reasoning: string;
}

/**
 * 任务拆解器
 */
export class TaskDecomposer {
  /**
   * 将复杂任务拆解为可执行的子任务
   */
  async decompose(
    taskDescription: string,
    context: TaskContext
  ): Promise<SubTask[]> {
    // 获取可用工具列表
    const availableTools = this.getAvailableTools(context);

    // 构建提示词
    const prompt = this.buildDecomposePrompt(taskDescription, context, availableTools);

    try {
      // 调用 LLM 进行拆解
      const response = await this.callLLM(prompt);

      // 解析响应
      const result = this.parseDecomposeResult(response);

      // 验证和修正子任务
      const validatedSubTasks = this.validateSubTasks(result.subTasks, context);

      return validatedSubTasks;
    } catch (error) {
      console.error("[TaskDecomposer] 拆解失败:", error);
      // 如果拆解失败，返回单个子任务
      return [
        {
          id: "step_1",
          description: taskDescription,
          dependsOn: [],
          estimatedLevel: Math.min(4, context.config.maxLevel),
          requiresApproval: false,
        },
      ];
    }
  }

  /**
   * 为单个子任务选择合适的工具
   */
  async selectTool(
    subTask: SubTask,
    context: TaskContext
  ): Promise<{ toolId: string | null; confidence: number; reasoning: string }> {
    // 如果已经预选了工具，直接返回
    if (subTask.toolId) {
      return {
        toolId: subTask.toolId,
        confidence: 1.0,
        reasoning: "预选工具",
      };
    }

    const availableTools = this.getAvailableTools(context);

    // 构建提示词
    const prompt = this.buildToolMatchPrompt(subTask, availableTools);

    try {
      const response = await this.callLLM(prompt);
      const result = this.parseToolMatchResult(response);
      return result;
    } catch (error) {
      console.error("[TaskDecomposer] 工具选择失败:", error);
      return {
        toolId: null,
        confidence: 0,
        reasoning: "工具选择失败",
      };
    }
  }

  /**
   * 获取可用的工具列表
   */
  private getAvailableTools(context: TaskContext): ToolDefinition[] {
    const allTools = toolRegistry.getAllTools();

    return allTools.filter((tool) => {
      // 检查是否在白名单中
      if (context.config.allowedTools?.length) {
        if (!context.config.allowedTools.includes(tool.id)) {
          return false;
        }
      }

      // 检查是否在黑名单中
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
   * 构建拆解提示词
   */
  private buildDecomposePrompt(
    taskDescription: string,
    context: TaskContext,
    availableTools: ToolDefinition[]
  ): string {
    const allowedToolsStr =
      context.config.allowedTools?.length
        ? context.config.allowedTools.join(", ")
        : "所有工具";

    return DECOMPOSE_PROMPT_TEMPLATE.replace("{taskDescription}", taskDescription)
      .replace("{agentId}", context.agentId)
      .replace("{agentName}", context.agentId)
      .replace("{maxLevel}", String(context.config.maxLevel))
      .replace("{allowedTools}", allowedToolsStr)
      .replace(
        "{projectContext}",
        context.memory?.projectContext
          ? JSON.stringify(context.memory.projectContext, null, 2)
          : "无"
      );
  }

  /**
   * 构建工具匹配提示词
   */
  private buildToolMatchPrompt(
    subTask: SubTask,
    availableTools: ToolDefinition[]
  ): string {
    const toolsDescription = availableTools
      .map(
        (t) =>
          `- ${t.id}: ${t.name} - ${t.description} (L${t.requiredLevel})`
      )
      .join("\n");

    return TOOL_MATCH_PROMPT.replace("{subTaskDescription}", subTask.description).replace(
      "{availableTools}",
      toolsDescription
    );
  }

  /**
   * 调用 LLM
   */
  private async callLLM(prompt: string): Promise<string> {
    const result = await aiGateway.createCompletion({
      messages: [
        {
          role: "system",
          content: "你是企业任务执行引擎的规划模块。严格按用户要求输出，不要添加无关解释。",
        },
        { role: "user", content: prompt },
      ],
      maxTokens: 2048,
      temperature: 0.1,
    });

    return result.content;
  }

  /**
   * 解析拆解结果
   */
  private parseDecomposeResult(response: string): DecomposeLLMResult {
    // 尝试提取 JSON
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                      response.match(/```\n?([\s\S]*?)\n?```/) ||
                      response.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      throw new Error("无法解析拆解结果");
    }

    const jsonStr = jsonMatch[1];
    if (!jsonStr) {
      throw new Error("无法解析拆解结果");
    }

    const result = JSON.parse(jsonStr);

    return {
      subTasks: result.subTasks ?? [],
      executionOrder: result.executionOrder ?? result.subTasks?.map((s: any) => s.id) ?? [],
      summary: result.summary ?? "",
    };
  }

  /**
   * 解析工具匹配结果
   */
  private parseToolMatchResult(response: string): ToolMatchResult {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                      response.match(/```\n?([\s\S]*?)\n?```/) ||
                      response.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      return {
        toolId: null,
        confidence: 0,
        reasoning: "无法解析匹配结果",
      };
    }

    const jsonStr = jsonMatch[1];
    if (!jsonStr) {
      return {
        toolId: null,
        confidence: 0,
        reasoning: "无法解析匹配结果",
      };
    }

    const result = JSON.parse(jsonStr);
    return {
      toolId: result.toolId ?? null,
      confidence: result.confidence ?? 0,
      reasoning: result.reasoning ?? "",
    };
  }

  /**
   * 验证和修正子任务
   */
  private validateSubTasks(subTasks: DecomposeLLMResult["subTasks"], context: TaskContext): SubTask[] {
    return subTasks.map((st) => ({
      id: st.id || randomUUID(),
      description: st.description,
      dependsOn: st.dependsOn ?? [],
      // 限制操作级别不超过 Agent 的最大级别
      estimatedLevel: Math.min(st.estimatedLevel ?? 1, context.config.maxLevel),
      requiresApproval: st.requiresApproval ?? st.estimatedLevel >= 4,
      toolId: st.toolId,
      metadata: {
        originalLevel: st.estimatedLevel,
        limited: st.estimatedLevel > context.config.maxLevel,
      },
    }));
  }

  /**
   * 根据子任务 ID 重新排序（拓扑排序）
   */
  topologicalSort(subTasks: SubTask[]): SubTask[] {
    const visited = new Set<string>();
    const result: SubTask[] = [];

    const visit = (task: SubTask) => {
      if (visited.has(task.id)) return;
      visited.add(task.id);

      // 先访问依赖
      for (const depId of task.dependsOn) {
        const dep = subTasks.find((t) => t.id === depId);
        if (dep) {
          visit(dep);
        }
      }

      result.push(task);
    };

    for (const task of subTasks) {
      visit(task);
    }

    return result;
  }
}

/**
 * 全局任务拆解器实例
 */
export const taskDecomposer = new TaskDecomposer();
