// ─────────────────────────────────────────────────────────
// 数智企业 · IMAP Email Connector
// 读取邮件功能
// ─────────────────────────────────────────────────────────

import type { ToolDefinition, ToolCallResult, ToolCallContext } from "~/server/tools/types";
import { BaseToolExecutor } from "~/server/tools/registry";
import { withAudit } from "~/server/tools/toolAudit";
import { toolRegistry } from "~/server/tools/toolRegistry";
import { vaultService } from "~/server/vault";

// IMAP 配置类型
interface ImapCredential {
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  imapPassword: string;
}

// 邮件结构
interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  date: string;
  body: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
}

/**
 * 读取邮件 Tool 定义
 */
export const emailReadTool: ToolDefinition = {
  id: "email.read",
  name: "读取邮件",
  description: "通过 IMAP 读取邮件箱中的邮件。",
  systemType: "email",
  requiredLevel: 1, // L1: 只读查询
  requiresApproval: false,
  parameters: [
    {
      name: "credentialId",
      type: "string",
      description: "邮件凭证 ID",
      required: true,
    },
    {
      name: "folder",
      type: "string",
      description: "邮件文件夹（INBOX, Sent, Drafts 等）",
      required: false,
      default: "INBOX",
    },
    {
      name: "limit",
      type: "number",
      description: "最多读取多少封邮件",
      required: false,
      default: 10,
    },
    {
      name: "unreadOnly",
      type: "boolean",
      description: "是否只读取未读邮件",
      required: false,
      default: false,
    },
    {
      name: "searchText",
      type: "string",
      description: "搜索关键词（搜索主题和发件人）",
      required: false,
    },
  ],
  outputSchema: {
    type: "object",
    description: "返回邮件列表",
  },
};

/**
 * 获取单封邮件详情
 */
export const emailGetTool: ToolDefinition = {
  id: "email.get",
  name: "获取邮件详情",
  description: "获取指定邮件的完整内容，包括正文和附件信息。",
  systemType: "email",
  requiredLevel: 1,
  requiresApproval: false,
  parameters: [
    {
      name: "credentialId",
      type: "string",
      description: "邮件凭证 ID",
      required: true,
    },
    {
      name: "messageId",
      type: "string",
      description: "邮件 ID",
      required: true,
    },
    {
      name: "markAsRead",
      type: "boolean",
      description: "获取后标记为已读",
      required: false,
      default: false,
    },
  ],
  outputSchema: {
    type: "object",
    description: "返回邮件详情",
  },
};

/**
 * 搜索邮件 Tool
 */
export const emailSearchTool: ToolDefinition = {
  id: "email.search",
  name: "搜索邮件",
  description: "根据条件搜索邮件。",
  systemType: "email",
  requiredLevel: 1,
  requiresApproval: false,
  parameters: [
    {
      name: "credentialId",
      type: "string",
      description: "邮件凭证 ID",
      required: true,
    },
    {
      name: "criteria",
      type: "string",
      description: "搜索条件（IMAP 标准条件，如: FROM \"user@example.com\" SUBJECT \"会议\"）",
      required: true,
    },
    {
      name: "folder",
      type: "string",
      description: "邮件文件夹",
      required: false,
      default: "INBOX",
    },
    {
      name: "limit",
      type: "number",
      description: "最多返回多少结果",
      required: false,
      default: 20,
    },
  ],
  outputSchema: {
    type: "object",
    description: "返回搜索结果列表",
  },
};

/**
 * 邮件读取执行器
 */
class EmailReaderExecutor extends BaseToolExecutor {
  async execute(
    definition: ToolDefinition,
    params: unknown,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const startTime = Date.now();
    const p = params as {
      credentialId: string;
      folder?: string;
      limit?: number;
      unreadOnly?: boolean;
      searchText?: string;
    };

    try {
      // 从 Vault 获取凭证
      const credData = await vaultService.getCredentialData(p.credentialId, context.agentId);
      if (!credData) {
        return {
          success: false,
          error: "未找到邮件凭证",
          executionTimeMs: Date.now() - startTime,
        };
      }

      // TODO: 实现真实的 IMAP 读取
      // const cred: ImapCredential = JSON.parse(credData);
      // const emails = await this.fetchEmails(cred, p);

      // 模拟返回
      const mockEmails: EmailMessage[] = [
        {
          id: "msg_001",
          from: "hr@company.com",
          to: ["user@example.com"],
          subject: "面试邀请",
          date: new Date().toISOString(),
          body: "您好，邀请您参加面试...",
        },
      ];

      return {
        success: true,
        data: { emails: mockEmails, total: mockEmails.length },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error("[Email] 读取邮件失败:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "读取邮件失败",
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * IMAP 连接和读取（待实现）
   */
  private async fetchEmails(cred: ImapCredential, params: {
    folder?: string;
    limit?: number;
    unreadOnly?: boolean;
    searchText?: string;
  }): Promise<EmailMessage[]> {
    // TODO: 使用 imap 模块实现
    // const Imap = require('imap');
    // const { simpleParser } = require('mailparser');
    throw new Error("IMAP 功能待实现，请先安装 npm install imap mailparser");
  }
}

/**
 * 邮件搜索执行器
 */
class EmailSearchExecutor extends BaseToolExecutor {
  async execute(
    definition: ToolDefinition,
    params: unknown,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const startTime = Date.now();
    const p = params as {
      credentialId: string;
      criteria: string;
      folder?: string;
      limit?: number;
    };

    try {
      const credData = await vaultService.getCredentialData(p.credentialId, context.agentId);
      if (!credData) {
        return {
          success: false,
          error: "未找到邮件凭证",
          executionTimeMs: Date.now() - startTime,
        };
      }

      // TODO: 实现 IMAP 搜索
      // const cred: ImapCredential = JSON.parse(credData);
      // const emails = await this.imapSearch(cred, p);

      // 模拟返回
      return {
        success: true,
        data: { emails: [], total: 0 },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error("[Email] 搜索邮件失败:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "搜索邮件失败",
        executionTimeMs: Date.now() - startTime,
      };
    }
  }
}

const emailReaderExecutor = new EmailReaderExecutor();
const emailSearchExecutor = new EmailSearchExecutor();

/**
 * 注册邮件读取 Tools
 */
export function registerEmailReadTools() {
  toolRegistry.register(emailReadTool, withAudit(async (t, p, c) => emailReaderExecutor.execute(t, p, c)));
  toolRegistry.register(emailSearchTool, withAudit(async (t, p, c) => emailSearchExecutor.execute(t, p, c)));
  console.log("[Email] 已注册邮件读取 Tools:", [emailReadTool.id, emailSearchTool.id]);
}

// 自动注册
if (typeof window === "undefined") {
  registerEmailReadTools();
}
