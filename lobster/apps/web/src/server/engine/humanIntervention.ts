// ─────────────────────────────────────────────────────────
// 人类接管处理器
// 处理验证码、登录失效、风控等需要人工介入的情况
// ─────────────────────────────────────────────────────────

import type {
  TaskContext,
  InterventionType,
  InterventionDecision,
  InterventionDetails,
  InterventionMetadata,
  InterventionResolution,
} from "./types";
import type { SubTask } from "./types";
import { db as prisma } from "~/server/db";
import { notificationService } from "./notificationService";
import { taskRepo } from "~/lib/repository";

/**
 * 接管触发器配置
 */
interface InterventionTrigger {
  type: InterventionType;
  patterns: RegExp[];
  retryable: boolean;
  maxRetries: number;
  defaultMessage: string;
}

/**
 * 人类接管处理器
 */
export class HumanInterventionHandler {
  private triggers: InterventionTrigger[] = [];

  constructor() {
    this.initDefaultTriggers();
  }

  /**
   * 初始化默认触发条件
   */
  private initDefaultTriggers() {
    // 验证码
    this.addTrigger({
      type: "captcha",
      patterns: [
        /验证码/i,
        /captcha/i,
        /滑块/i,
        /验证/i,
        /点选/i,
        /拖动/i,
      ],
      retryable: true,
      maxRetries: 3,
      defaultMessage: "检测到验证码，需要人工处理",
    });

    // 二次认证
    this.addTrigger({
      type: "verify_code",
      patterns: [
        /二次验证/i,
        /二次认证/i,
        /two-factor/i,
        /2fa/i,
        /mfa/i,
      ],
      retryable: false,
      maxRetries: 1,
      defaultMessage: "需要二次验证，请人工处理",
    });

    // 登录失效
    this.addTrigger({
      type: "login_expired",
      patterns: [
        /登录.*失效/i,
        /请先登录/i,
        /未登录/i,
        /登录.*过期/i,
        /session.*expired/i,
        /登录.*过期/i,
        /token.*expired/i,
        /请登录/i,
      ],
      retryable: true,
      maxRetries: 1,
      defaultMessage: "登录态已失效，请重新登录",
    });

    // 风控弹窗
    this.addTrigger({
      type: "risk_alert",
      patterns: [
        /风控/i,
        /风险/i,
        /异常/i,
        /违规/i,
        /封号/i,
        /账号异常/i,
        /账号.*限制/i,
        /操作.*频繁/i,
        /risk.*alert/i,
        /blocked/i,
      ],
      retryable: false,
      maxRetries: 0,
      defaultMessage: "检测到风控提示，需要人工处理",
    });

    // 人脸验证
    this.addTrigger({
      type: "face_verify",
      patterns: [
        /人脸/i,
        /人脸识别/i,
        /face.*verify/i,
        /刷脸/i,
        /面容/i,
      ],
      retryable: false,
      maxRetries: 0,
      defaultMessage: "需要人脸验证，请人工处理",
    });

    // 短信验证
    this.addTrigger({
      type: "sms_verify",
      patterns: [
        /短信验证/i,
        /手机验证/i,
        /sms.*verify/i,
        /手机.*码/i,
      ],
      retryable: false,
      maxRetries: 0,
      defaultMessage: "需要短信验证，请人工处理",
    });

    // 扫码登录
    this.addTrigger({
      type: "qr_code",
      patterns: [
        /扫码登录/i,
        /二维码/i,
        /qr.*code/i,
        /scan.*qr/i,
      ],
      retryable: false,
      maxRetries: 0,
      defaultMessage: "需要扫码登录，请人工处理",
    });

    // 页面改版
    this.addTrigger({
      type: "page_change",
      patterns: [
        /页面.*变化/i,
        /页面.*更新/i,
        /页面.*改版/i,
        /页面.*不匹配/i,
        /element.*not.*found/i,
        /no.*such.*element/i,
      ],
      retryable: true,
      maxRetries: 3,
      defaultMessage: "页面结构发生变化，请人工确认",
    });

    // 需要手动处理
    this.addTrigger({
      type: "manual_required",
      patterns: [
        /人工/i,
        /手动/i,
        /manual/i,
        /人工.*介入/i,
      ],
      retryable: false,
      maxRetries: 0,
      defaultMessage: "任务需要人工介入处理",
    });
  }

  /**
   * 添加触发条件
   */
  addTrigger(trigger: InterventionTrigger): void {
    this.triggers.push(trigger);
  }

  /**
   * 判断是否需要人类接管
   */
  shouldIntercept(
    error: Error,
    context: TaskContext,
    subTask?: SubTask
  ): InterventionDecision {
    const errorMessage = error.message;

    // 检查错误消息是否匹配触发条件
    for (const trigger of this.triggers) {
      for (const pattern of trigger.patterns) {
        if (pattern.test(errorMessage)) {
          return {
            shouldIntercept: true,
            type: trigger.type,
            message: error.message || trigger.defaultMessage,
            retryable: trigger.retryable,
            maxRetries: trigger.maxRetries,
          };
        }
      }
    }

    // 检查是否是常见错误类型
    if (this.isCommonInterceptableError(error)) {
      return {
        shouldIntercept: true,
        type: "manual_required",
        message: error.message,
        retryable: false,
        maxRetries: 0,
      };
    }

    return { shouldIntercept: false };
  }

  /**
   * 检查是否是常见的可拦截错误
   */
  private isCommonInterceptableError(error: Error): boolean {
    const interceptableErrors = [
      "timeout",
      "network",
      "connection",
      "rate limit",
      "too many requests",
      "access denied",
      "forbidden",
      "unauthorized",
      "captcha",
      "blocked",
    ];

    const message = error.message.toLowerCase();
    return interceptableErrors.some((e) => message.includes(e));
  }

  /**
   * 触发接管流程
   */
  async triggerIntervention(
    details: InterventionDetails,
    context: TaskContext
  ): Promise<string> {
    console.log(`[HumanIntervention] 触发接管: ${details.type} - ${details.title}`);

    const supervisor = await this.findNearestHumanSupervisor(context);
    if (!supervisor) {
      console.error("[HumanIntervention] 未找到可接管的人");
      throw new Error("未找到可接管的人");
    }

    const interventionTask = await this.createInterventionTask(details, context, supervisor.id);

    await this.notifySupervisor(supervisor, interventionTask, context, details);

    console.log(
      `[HumanIntervention] 接管任务已创建: ${interventionTask.id}, 指派给: ${supervisor.id}`
    );

    return interventionTask.id;
  }

  /**
   * 找到最近的自然人上司
   */
  private async findNearestHumanSupervisor(context: TaskContext): Promise<{
    id: string;
    name: string;
    email?: string;
  } | null> {
    if (context.supervisorId) {
      const supervisor = await prisma.employee.findUnique({
        where: { id: context.supervisorId },
      });
      if (supervisor?.isActive) {
        return {
          id: supervisor.id,
          name: supervisor.name,
          email: supervisor.email ?? undefined,
        };
      }
    }

    const agent = await prisma.agent.findUnique({
      where: { id: context.agentId },
      include: { owner: true },
    });

    if (agent?.owner?.isActive) {
      return {
        id: agent.owner.id,
        name: agent.owner.name,
        email: agent.owner.email ?? undefined,
      };
    }

    const manager = await prisma.employee.findFirst({
      where: {
        tenantId: context.tenantId,
        isActive: true,
        role: { in: ["ADMIN", "MANAGER"] },
      },
      orderBy: { createdAt: "asc" },
    });

    if (manager) {
      return { id: manager.id, name: manager.name, email: manager.email ?? undefined };
    }

    const fallback = await prisma.employee.findFirst({
      where: { tenantId: context.tenantId, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (fallback) {
      return { id: fallback.id, name: fallback.name, email: fallback.email ?? undefined };
    }

    return null;
  }

  /**
   * 创建接管任务
   */
  private async createInterventionTask(
    details: InterventionDetails,
    context: TaskContext,
    supervisorId: string
  ): Promise<{ id: string; title: string }> {
    const task = await taskRepo.create({
      title: `需要人工处理: ${details.title}`,
      description: `
## 问题类型
${details.type}

## 问题描述
${details.description}

## 尝试次数
${details.attempts}

${details.lastError ? `## 最后错误\n\`\`\`\n${details.lastError}\n\`\`\`` : ""}

${details.screenshot ? "## 截图\n已附截图" : ""}

---
此任务由 Agent 自动创建，请尽快处理。
        `.trim(),
      riskLevel: "HIGH",
      permissionLevel: 6,
      creatorId: supervisorId,
    });

    await taskRepo.update(task.id, {
      result: JSON.stringify({
        metadata: {
          interventionType: details.type,
          originalTaskId: context.taskId,
          originalAgentId: context.agentId,
          screenshot: details.screenshot,
          attempts: details.attempts,
          lastError: details.lastError,
        } satisfies InterventionMetadata,
        resolution: {
          action: "resume",
        },
      }),
    });

    return { id: task.id, title: task.title };
  }

  /**
   * 通知主管
   */
  private async notifySupervisor(
    supervisor: { id: string; name: string; email?: string },
    task: { id: string; title: string },
    context: TaskContext,
    details: InterventionDetails
  ): Promise<void> {
    await notificationService.notifyIntervention({
      interventionTaskId: task.id,
      originalTaskId: context.taskId,
      tenantId: context.tenantId,
      title: task.title,
      recipient: supervisor,
      message: [
        `问题类型：${details.type}`,
        `原任务：${context.taskId}`,
        `说明：${details.description}`,
        details.lastError ? `最后错误：${details.lastError}` : undefined,
      ].filter(Boolean).join("\n"),
    });
  }

  /**
   * 等待接管完成
   */
  async waitForIntervention(
    interventionTaskId: string,
    timeout: number = 3600000
  ): Promise<InterventionResolution> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const task = await taskRepo.findById(interventionTaskId);

      if (!task) {
        throw new Error(`接管任务不存在: ${interventionTaskId}`);
      }

      const resolution = this.parseResolution(task.result);

      if (task.status === "DONE") {
        return resolution ?? { action: "resume" };
      }

      if (task.status === "REJECTED") {
        return resolution?.action === "skip"
          ? resolution
          : { action: "abort", reason: resolution?.reason ?? "人工决定终止任务" };
      }

      // 每 5 秒检查一次
      await this.sleep(5000);
    }

    throw new Error(`等待人工接管超时: ${interventionTaskId}`);
  }

  /**
   * 从接管恢复继续执行
   */
  async resumeFromIntervention(
    originalTaskId: string,
    resumeFrom?: string
  ): Promise<void> {
    console.log(`[HumanIntervention] 从接管恢复继续执行任务: ${originalTaskId}`);

    const task = await taskRepo.findById(originalTaskId);

    if (!task) {
      throw new Error(`原任务不存在: ${originalTaskId}`);
    }

    await taskRepo.update(originalTaskId, {
      status: "IN_PROGRESS",
      result: JSON.stringify({
        resumed: true,
        resumedAt: new Date().toISOString(),
        resumeFrom,
      }),
    });
  }

  private parseResolution(rawResult?: string | null): InterventionResolution | null {
    if (!rawResult) return null;

    try {
      const parsed = JSON.parse(rawResult) as {
        action?: "resume" | "skip" | "abort";
        reason?: string;
        resumeFrom?: string;
        skipSubTaskId?: string;
        resolution?: {
          action?: "resume" | "skip" | "abort";
          reason?: string;
          resumeFrom?: string;
          skipSubTaskId?: string;
        };
      };

      const resolved = parsed.action ? parsed : parsed.resolution;
      if (!resolved?.action) {
        return null;
      }

      return {
        action: resolved.action,
        reason: resolved.reason,
        resumeFrom: resolved.resumeFrom,
        skipSubTaskId: resolved.skipSubTaskId,
      };
    } catch {
      return null;
    }
  }

  /**
   * 睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 全局人类接管处理器实例
 */
export const humanInterventionHandler = new HumanInterventionHandler();
