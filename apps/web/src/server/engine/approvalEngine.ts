// ─────────────────────────────────────────────────────────
// 审批规则引擎
// 定义什么动作需要审批，如何审批
// ─────────────────────────────────────────────────────────

import type {
  SubTask,
  TaskContext,
  ApprovalDecision,
  ApprovalRule,
  Approver,
} from "./types";
import type { ToolDefinition } from "~/server/tools/types";
import { toolRegistry } from "~/server/tools/toolRegistry";

/**
 * 审批规则引擎
 */
export class ApprovalEngine {
  private rules: ApprovalRule[] = [];

  constructor() {
    this.initDefaultRules();
  }

  /**
   * 初始化默认审批规则
   */
  private initDefaultRules() {
    // 规则 1: L4+ 操作需要审批（发送外部消息）
    this.addRule({
      id: "rule_l4_plus",
      name: "L4+ 操作审批",
      description: "所有 L4 及以上的操作需要人工审批",
      condition: async (subTask) => subTask.estimatedLevel >= 4,
      enabled: true,
    });

    // 规则 2: 打招呼操作强制审批
    this.addRule({
      id: "rule_boss_greet",
      name: "Boss 打招呼审批",
      description: "Boss 直聘打招呼必须审批",
      condition: async (subTask) => subTask.toolId === "boss.greet",
      enabled: true,
    });

    // 规则 3: 发送邮件需要审批
    this.addRule({
      id: "rule_email_send",
      name: "发送邮件审批",
      description: "发送邮件需要人工审批",
      condition: async (subTask) => subTask.toolId === "email.send",
      enabled: true,
    });

    // 规则 4: 特定工具强制审批
    this.addRule({
      id: "rule_approval_required",
      name: "工具级强制审批",
      description: "工具定义中标记需要审批的操作",
      condition: async (subTask, context) => {
        // 工具定义中标记 requiresApproval 的操作
        const tool = toolRegistry.getTool(subTask.toolId ?? "");
        return tool?.requiresApproval ?? false;
      },
      enabled: true,
    });

    // 规则 5: 批量操作需要审批
    this.addRule({
      id: "rule_batch_operation",
      name: "批量操作审批",
      description: "涉及批量操作需要审批",
      condition: async (subTask) => {
        const batchKeywords = ["批量", "batch", "mass", "bulk", "多个", "全部"];
        return batchKeywords.some((kw) =>
          subTask.description.toLowerCase().includes(kw.toLowerCase())
        );
      },
      enabled: true,
    });

    // 规则 6: 高风险操作
    this.addRule({
      id: "rule_high_risk",
      name: "高风险操作审批",
      description: "涉及删除、取消、退款等高风险操作",
      condition: async (subTask) => {
        const riskKeywords = [
          "删除",
          "取消",
          "退款",
          "作废",
          "delete",
          "cancel",
          "refund",
          "revoke",
          "解约",
        ];
        return riskKeywords.some((kw) =>
          subTask.description.toLowerCase().includes(kw)
        );
      },
      enabled: true,
    });
  }

  /**
   * 添加审批规则
   */
  addRule(rule: ApprovalRule): void {
    this.rules.push(rule);
  }

  /**
   * 移除审批规则
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
  }

  /**
   * 启用/禁用规则
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * 判断任务是否需要审批
   */
  async requiresApproval(
    subTask: SubTask,
    context: TaskContext
  ): Promise<ApprovalDecision> {
    // 检查工具是否明确标记不需要审批
    if (subTask.toolId) {
      const toolRegistry = await import("~/server/tools/toolRegistry");
      const tool = toolRegistry.toolRegistry.getTool(subTask.toolId);
      if (tool && !tool.requiresApproval && subTask.estimatedLevel < 4) {
        return { required: false };
      }
    }

    // 按优先级检查规则
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      try {
        const matches = await rule.condition(subTask, context);
        if (matches) {
          return {
            required: true,
            reason: rule.description ?? rule.name,
            approver: rule.approver,
            urgency: this.determineUrgency(subTask, rule),
          };
        }
      } catch (error) {
        console.error(`[ApprovalEngine] 规则 ${rule.id} 执行失败:`, error);
      }
    }

    return { required: false };
  }

  /**
   * 判断审批紧急程度
   */
  private determineUrgency(subTask: SubTask, rule: ApprovalRule): "low" | "normal" | "high" {
    // 高风险关键词
    const highRiskKeywords = [
      "删除",
      "取消",
      "退款",
      "作废",
      "解约",
      "delete",
      "cancel",
      "refund",
    ];
    if (highRiskKeywords.some((kw) => subTask.description.includes(kw))) {
      return "high";
    }

    // 低风险关键词
    const lowRiskKeywords = ["查询", "搜索", "查看", "获取"];
    if (lowRiskKeywords.some((kw) => subTask.description.includes(kw))) {
      return "low";
    }

    return "normal";
  }

  /**
   * 获取所有审批规则
   */
  getRules(): ApprovalRule[] {
    return [...this.rules];
  }

  /**
   * 获取启用的规则
   */
  getEnabledRules(): ApprovalRule[] {
    return this.rules.filter((r) => r.enabled);
  }

  /**
   * 创建审批人
   * 默认使用上下文中的 supervisor
   */
  createApprover(context: TaskContext): Approver {
    return {
      type: "user",
      id: context.supervisorId,
    };
  }

  /**
   * 规则条件工厂方法
   */

  /**
   * 按工具 ID 匹配
   */
  static toolIdCondition(toolIds: string[]): (subTask: SubTask) => Promise<boolean> {
    return async (subTask) => toolIds.includes(subTask.toolId ?? "");
  }

  /**
   * 按操作级别匹配
   */
  static levelCondition(minLevel: number): (subTask: SubTask) => Promise<boolean> {
    return async (subTask) => subTask.estimatedLevel >= minLevel;
  }

  /**
   * 按关键词匹配
   */
  static keywordCondition(keywords: string[]): (subTask: SubTask) => Promise<boolean> {
    return async (subTask) =>
      keywords.some((kw) => subTask.description.toLowerCase().includes(kw.toLowerCase()));
  }

  /**
   * 组合条件（AND）
   */
  static andConditions(
    ...conditions: Array<(subTask: SubTask, context: TaskContext) => Promise<boolean>>
  ): (subTask: SubTask, context: TaskContext) => Promise<boolean> {
    return async (subTask, context) => {
      for (const condition of conditions) {
        if (!(await condition(subTask, context))) {
          return false;
        }
      }
      return true;
    };
  }

  /**
   * 组合条件（OR）
   */
  static orConditions(
    ...conditions: Array<(subTask: SubTask, context: TaskContext) => Promise<boolean>>
  ): (subTask: SubTask, context: TaskContext) => Promise<boolean> {
    return async (subTask, context) => {
      for (const condition of conditions) {
        if (await condition(subTask, context)) {
          return true;
        }
      }
      return false;
    };
  }

  /**
   * 取反条件
   */
  static notCondition(
    condition: (subTask: SubTask, context: TaskContext) => Promise<boolean>
  ): (subTask: SubTask, context: TaskContext) => Promise<boolean> {
    return async (subTask, context) => !(await condition(subTask, context));
  }
}

/**
 * 全局审批引擎实例
 */
export const approvalEngine = new ApprovalEngine();
