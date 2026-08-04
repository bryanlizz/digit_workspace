// ─────────────────────────────────────────────────────────
// 数智企业 · SMTP 邮件发送 Connector
// 基于 Nodemailer 的真实邮件发送工具
// ─────────────────────────────────────────────────────────

import { createTransport } from "nodemailer";
import { env } from "~/env";
import type { ToolDefinition, ToolCallResult, ToolCallContext, IToolExecutor } from "~/server/tools/types";
import { toolRegistry } from "../toolRegistry";

export const smtpSendTool: ToolDefinition = {
  id: "email.send",
  name: "发送邮件",
  description: "通过 SMTP 发送邮件",
  systemType: "email",
  requiredLevel: 2,
  requiresApproval: true,
  parameters: [
    { name: "to", type: "string", description: "收件人邮箱", required: true },
    { name: "subject", type: "string", description: "邮件主题", required: true },
    { name: "body", type: "string", description: "邮件正文（纯文本）", required: true },
    { name: "cc", type: "string", description: "抄送（逗号分隔）", required: false },
    { name: "html", type: "string", description: "HTML 正文（可选）", required: false },
  ],
};

export class SmtpExecutor implements IToolExecutor {
  async execute(_def: ToolDefinition, params: Record<string, unknown>, _ctx: ToolCallContext): Promise<ToolCallResult> {
    const startTime = Date.now();
    try {
      if (!env.SMTP_HOST) {
        return { success: false, error: "SMTP 未配置 (SMTP_HOST)", executionTimeMs: 0 };
      }

      const transporter = createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: env.SMTP_SECURE ?? false,
        auth: { user: env.SMTP_USER ?? "", pass: env.SMTP_PASS ?? "" },
      });

      const info = await transporter.sendMail({
        from: env.SMTP_FROM ?? "lobster@example.com",
        to: String(params.to ?? ""),
        cc: params.cc ? String(params.cc) : undefined,
        subject: String(params.subject ?? ""),
        text: String(params.body ?? ""),
        html: params.html ? String(params.html) : undefined,
      });

      return {
        success: true,
        data: { messageId: info.messageId, accepted: info.accepted, response: info.response },
        executionTimeMs: Date.now() - startTime,
        startedAt: new Date(startTime),
        completedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "邮件发送失败",
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  validate(params: unknown, _def: ToolDefinition): boolean {
    if (typeof params !== "object" || params === null) return false;
    const p = params as Record<string, unknown>;
    return typeof p.to === "string" && p.to.length > 0 && typeof p.subject === "string" && typeof p.body === "string";
  }
}

toolRegistry.register(smtpSendTool, new SmtpExecutor());
