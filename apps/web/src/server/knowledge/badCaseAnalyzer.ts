// ─────────────────────────────────────────────────────────
// 数智企业 · Bad Case 自动归因
// AI 分析失败原因，归类并生成改进建议
// ─────────────────────────────────────────────────────────

import { aiGateway } from "~/server/gateway/aiGateway";

export interface BadCaseAttribution {
  category: "tool_error" | "permission" | "timeout" | "auth" | "data" | "unknown";
  rootCause: string;
  suggestion: string;
  confidence: number;
}

const ERROR_PATTERNS: Array<{ pattern: RegExp; category: BadCaseAttribution["category"] }> = [
  { pattern: /permission|unauthorized|forbidden|权限|授权/i, category: "permission" },
  { pattern: /timeout|timed?[\s_-]?out|超时|等待/i, category: "timeout" },
  { pattern: /auth|login|token|credential|登录|认证|凭证|令牌/i, category: "auth" },
  { pattern: /not found|missing|invalid|不存在|无效|格式/i, category: "data" },
  { pattern: /tool|executor|execute|执行|工具/i, category: "tool_error" },
];

export async function analyzeBadCase(
  taskTitle: string,
  errorMessage: string,
  taskDescription?: string | null,
): Promise<BadCaseAttribution> {
  // 1. Pattern-based quick categorization
  for (const { pattern, category } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return {
        category,
        rootCause: extractRootCause(errorMessage, category),
        suggestion: getSuggestion(category),
        confidence: 0.7,
      };
    }
  }

  // 2. AI deep analysis for complex cases
  try {
    const result = await aiGateway.createCompletion({
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `分析任务执行失败原因，输出 JSON。\n任务: ${taskTitle}\n描述: ${taskDescription ?? "无"}\n错误: ${errorMessage}\n\n{"category":"tool_error|permission|timeout|auth|data|unknown","rootCause":"简短原因","suggestion":"改进建议"}`,
      }],
      responseFormat: { type: "json_object" },
      maxTokens: 200,
    });

    const parsed = JSON.parse(result.content) as BadCaseAttribution;
    return { ...parsed, confidence: 0.85 };
  } catch {
    // Fallback
    return {
      category: "unknown",
      rootCause: errorMessage.slice(0, 100),
      suggestion: "请人工分析此失败案例",
      confidence: 0.1,
    };
  }
}

function extractRootCause(error: string, category: BadCaseAttribution["category"]): string {
  const labels: Record<string, string> = {
    tool_error: "工具执行异常",
    permission: "权限不足",
    timeout: "请求超时",
    auth: "认证/凭证失效",
    data: "数据格式或内容错误",
    unknown: "未分类错误",
  };
  return labels[category] ?? error.slice(0, 80);
}

function getSuggestion(category: BadCaseAttribution["category"]): string {
  const suggestions: Record<BadCaseAttribution["category"], string> = {
    tool_error: "检查工具定义和参数，确认外部系统可用",
    permission: "提升 Agent 操作级别或调整审批规则",
    timeout: "增加超时时间或拆分任务步骤",
    auth: "刷新凭证或重新授权 OAuth Token",
    data: "检查输入数据格式，添加前置校验",
    unknown: "建议人工复核并标注归因",
  };
  return suggestions[category] ?? suggestions.unknown;
}
