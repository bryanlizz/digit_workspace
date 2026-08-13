import { agentRepo } from "~/lib/repository";
import { aiGateway } from "../gateway/aiGateway";

// USE_MOCK: true = 模拟模式, false = 真实 AI 调用
const USE_MOCK_BY_DEFAULT = false;

export interface AgentExecuteParams {
  agentId: string;
  taskTitle: string;
  taskDescription: string;
  projectContext?: string;
  pastMemories?: string[];
  knowledgeContext?: string;
  onStream?: (chunk: string) => void;
}

export interface AgentExecuteResult {
  success: boolean;
  content: string;
  tokensUsed: number;
  model: string;
  executionTimeMs: number;
  keyId?: string;
}

async function shouldUseRealAI(): Promise<boolean> {
  if (USE_MOCK_BY_DEFAULT) return false;
  return aiGateway.canUseRealAI();
}

export async function executeWithAI(
  params: AgentExecuteParams,
): Promise<AgentExecuteResult> {
  const startTime = Date.now();

  const coreMemory = await agentRepo.getCoreMemory(params.agentId);
  const roleDef = coreMemory?.roleDefinition;

  const sections = [
    "你是一个企业数字员工，请根据角色定义执行任务。",
    roleDef ? `角色：${roleDef.title}` : "",
    roleDef ? `技能：${roleDef.skills.join("、")}` : "",
    roleDef ? `性格：${roleDef.personality}` : "",
    roleDef ? `边界规则：${roleDef.boundaries}` : "",
    "",
    `任务目标：${params.taskTitle}`,
    params.taskDescription ? `任务描述：${params.taskDescription}` : "",
    params.projectContext ? `项目上下文：${params.projectContext}` : "",
    "",
    params.pastMemories?.length ? `过往经验参考：\n${params.pastMemories.join("\n")}` : "",
    params.knowledgeContext ? `知识库参考：${params.knowledgeContext}` : "",
    "",
    "请以专业、清晰的方式输出结果。如果需要更多信息，请明确提问。",
    "注意：你只能使用已授权的权限。不要执行未授权的操作。",
  ];
  const systemPrompt = sections.filter(Boolean).join("\n");

  const useRealAI = await shouldUseRealAI();

  if (!useRealAI) {
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));

    const mockResult = [
      `## 执行结果：${params.taskTitle}`,
      "",
      `**执行角色**：${roleDef?.title ?? "数字员工"}`,
      "",
      "### 分析过程",
      `1. 应用 ${roleDef?.skills[0] ?? "专业"} 方法论进行分析`,
      "2. 交叉验证多个数据来源",
      "3. 整理结构化输出",
      "",
      "### 核心发现",
      "- ✅ 数据验证通过，来源可靠",
      "- 📊 识别出 3 个关键趋势",
      "- ⚠️ 发现 1 个潜在风险点",
      "",
      "### 建议",
      "建议基于此结果在下一次团队会议上讨论。",
      "",
      `_🤖 由 ${params.agentId} 自动生成 · 模拟模式_`,
    ].join("\n");

    if (params.onStream) {
      for (const char of mockResult) {
        params.onStream(char);
        await new Promise((r) => setTimeout(r, 3));
      }
    }

    return {
      success: true,
      content: mockResult,
      tokensUsed: Math.floor(Math.random() * 800) + 300,
      model: "gpt-4o-mock",
      executionTimeMs: Date.now() - startTime,
    };
  }

  try {
    const result = await aiGateway.createCompletion({
      provider: "openai",
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `请执行以下任务：\n${params.taskTitle}\n\n${params.taskDescription ?? ""}` },
      ],
      maxTokens: 4096,
      temperature: 0.7,
    });

    if (params.onStream) {
      for (const char of result.content) {
        params.onStream(char);
        await new Promise((r) => setTimeout(r, 3));
      }
    }

    const keyConfig = aiGateway.getAvailableKey("openai");
    if (keyConfig) {
      aiGateway.recordCall(keyConfig.id, result.tokensUsed);
    }

    return {
      success: true,
      content: result.content,
      tokensUsed: result.tokensUsed,
      model: result.model,
      executionTimeMs: Date.now() - startTime,
      keyId: keyConfig?.id,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI 调用失败";
    console.error("[aiExecutor] AI 调用异常:", msg);
    return {
      success: false,
      content: msg,
      tokensUsed: 0,
      model: "gpt-4o",
      executionTimeMs: Date.now() - startTime,
    };
  }
}

export async function executeWithRetry(
  params: AgentExecuteParams,
  maxRetries = 3,
): Promise<AgentExecuteResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await executeWithAI(params);
      if (result.success) return result;
      if (i === maxRetries - 1) return result;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`AI 执行失败，第 ${i + 2} 次重试...`, error);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("AI 执行失败，已达最大重试次数");
}
