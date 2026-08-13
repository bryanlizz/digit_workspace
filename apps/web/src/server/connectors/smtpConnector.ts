// ─────────────────────────────────────────────────────────
// 数智企业 · SMTP Email Connector
// 发送邮件功能
// ─────────────────────────────────────────────────────────

import nodemailer from "nodemailer";
import type { ToolDefinition, ToolCallResult, ToolCallContext } from "~/server/tools/types";
import { BaseToolExecutor } from "~/server/tools/registry";
import { withAudit } from "~/server/tools/toolAudit";
import { toolRegistry } from "~/server/tools/toolRegistry";
import { vaultService } from "~/server/vault";

/**
 * Email 凭证类型
 */
interface EmailCredential {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
}

/**
 * 发送邮件 Tool 定义
 */
export const emailSendTool: ToolDefinition = {
  id: "email.send",
  name: "发送邮件",
  description: "通过 SMTP 发送邮件。支持文本、HTML 格式，可添加附件。",
  systemType: "email",
  requiredLevel: 4, // L4: 发送外部消息
  requiresApproval: true, // 发送邮件需要审批
  parameters: [
    {
      name: "credentialId",
      type: "string",
      description: "邮件凭证 ID（配置在 Vault 中的 SMTP 配置）",
      required: true,
    },
    {
      name: "to",
      type: "string",
      description: "收件人邮箱，多个用逗号分隔",
      required: true,
    },
    {
      name: "cc",
      type: "string",
      description: "抄送邮箱，多个用逗号分隔",
      required: false,
    },
    {
      name: "bcc",
      type: "string",
      description: "密送邮箱，多个用逗号分隔",
      required: false,
    },
    {
      name: "subject",
      type: "string",
      description: "邮件主题",
      required: true,
    },
    {
      name: "html",
      type: "string",
      description: "邮件内容（HTML 格式）",
      required: false,
    },
    {
      name: "text",
      type: "string",
      description: "邮件内容（纯文本格式）",
      required: false,
    },
    {
      name: "attachments",
      type: "array",
      description: "附件列表（格式: [{filename, path, content}])",
      required: false,
    },
  ],
  outputSchema: {
    type: "object",
    description: "返回发送结果，包含消息 ID",
  },
  examples: [
    '{"to": "user@example.com", "subject": "会议通知", "text": "明天上午10点开会"}',
    '{"to": "user@example.com", "subject": "报告", "html": "<h1>月度报告</h1><p>详见附件</p>"}',
  ],
};

/**
 * 发送邮件执行器
 */
class EmailSenderExecutor extends BaseToolExecutor {
  async execute(
    definition: ToolDefinition,
    params: unknown,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const startTime = Date.now();
    const p = params as {
      credentialId: string;
      to: string;
      cc?: string;
      bcc?: string;
      subject: string;
      html?: string;
      text?: string;
      attachments?: Array<{ filename: string; path?: string; content?: string }>;
    };

    try {
      // 从 Vault 获取邮件凭证
      const credentialData = await vaultService.getCredentialData(p.credentialId, context.agentId);
      if (!credentialData) {
        return {
          success: false,
          error: "未找到邮件凭证或无权限访问",
          executionTimeMs: Date.now() - startTime,
        };
      }

      const cred: EmailCredential = JSON.parse(credentialData.data) as EmailCredential;

      // 创建 nodemailer transporter
      const transporter = nodemailer.createTransport({
        host: cred.smtpHost,
        port: cred.smtpPort,
        secure: cred.smtpSecure,
        auth: {
          user: cred.smtpUser,
          pass: cred.smtpPassword,
        },
      });

      // 解析收件人
      const toRecipients = p.to.split(",").map((email: string) => email.trim()).filter(Boolean);
      const ccRecipients = p.cc
        ? p.cc.split(",").map((email: string) => email.trim()).filter(Boolean)
        : [];
      const bccRecipients = p.bcc
        ? p.bcc.split(",").map((email: string) => email.trim()).filter(Boolean)
        : [];

      // 构建附件
      const attachments = p.attachments?.map((att) => ({
        filename: att.filename,
        path: att.path,
        content: att.content,
      }));

      // 发送邮件
      const info = await transporter.sendMail({
        from: `"${cred.fromName}" <${cred.fromEmail}>`,
        to: toRecipients.join(", "),
        cc: ccRecipients.length > 0 ? ccRecipients.join(", ") : undefined,
        bcc: bccRecipients.length > 0 ? bccRecipients.join(", ") : undefined,
        subject: p.subject,
        html: p.html,
        text: p.text,
        attachments,
      });

      return {
        success: true,
        data: {
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
        },
        externalRecordId: info.messageId,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error("[Email] 发送邮件失败:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "发送邮件失败",
        executionTimeMs: Date.now() - startTime,
      };
    }
  }
}

const emailSenderExecutor = new EmailSenderExecutor();

/**
 * 带审计的发送邮件执行器
 */
const auditedEmailSender = withAudit(async (tool, params, context) => {
  return emailSenderExecutor.execute(tool, params, context);
});

/**
 * 注册邮件 Tool
 */
export function registerEmailTools() {
  toolRegistry.register(emailSendTool, auditedEmailSender);
  console.log("[Email] 已注册邮件 Tool:", emailSendTool.id);
}

// 自动注册
if (typeof window === "undefined") {
  registerEmailTools();
}