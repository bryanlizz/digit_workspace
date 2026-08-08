// ─────────────────────────────────────────────────────────
// 数智企业 · IMAP Email Connector
// 真实 IMAP 邮件读取功能
// ─────────────────────────────────────────────────────────

import Imap from "imap";
import { simpleParser } from "mailparser";
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
 * 从 mailparser 解析的 AddressObject 中提取地址列表
 */
function extractAddresses(
  addr: { value?: Array<{ address?: string; name?: string }> } | Array<{ value?: Array<{ address?: string; name?: string }> }> | undefined
): string[] {
  if (!addr) return [];
  if (Array.isArray(addr)) {
    return addr.flatMap((a) => a.value?.map((v) => v.address ?? "").filter(Boolean) ?? []);
  }
  return addr.value?.map((v) => v.address ?? "").filter(Boolean) ?? [];
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
 * 邮件读取执行器（真实 IMAP）
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
      const credData = await vaultService.getCredentialData(p.credentialId, context.agentId);
      if (!credData) {
        return {
          success: false,
          error: "未找到邮件凭证",
          executionTimeMs: Date.now() - startTime,
        };
      }

      const cred: ImapCredential = JSON.parse(credData.data) as ImapCredential;
      const emails = await this.fetchEmails(cred, {
        folder: p.folder ?? "INBOX",
        limit: p.limit ?? 10,
        unreadOnly: p.unreadOnly ?? false,
        searchText: p.searchText,
      });

      return {
        success: true,
        data: { emails, total: emails.length },
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
   * 连接 IMAP 并获取邮件
   */
  private async fetchEmails(cred: ImapCredential, params: {
    folder?: string;
    limit?: number;
    unreadOnly?: boolean;
    searchText?: string;
  }): Promise<EmailMessage[]> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: cred.imapUser,
        password: cred.imapPassword,
        host: cred.imapHost,
        port: cred.imapPort,
        tls: cred.imapSecure,
        tlsOptions: { rejectUnauthorized: false },
      });

      const messages: EmailMessage[] = [];

      imap.once("ready", () => {
        imap.openBox(params.folder ?? "INBOX", false, (err, box) => {
          if (err) {
            imap.end();
            reject(new Error(`无法打开邮箱: ${err.message}`));
            return;
          }

          // 构建搜索条件
          const searchCriteria: unknown[] = [];
          if (params.unreadOnly) {
            searchCriteria.push(["UNSEEN"]);
          }
          if (params.searchText) {
            searchCriteria.push([
              "OR",
              ["HEADER", "SUBJECT", params.searchText],
              ["HEADER", "FROM", params.searchText],
            ]);
          }
          // 如果没有搜索条件，使用 ALL
          const criteria = searchCriteria.length > 0 ? searchCriteria : ["ALL"];

          imap.search(criteria, (searchErr, uids) => {
            if (searchErr) {
              imap.end();
              reject(new Error(`邮件搜索失败: ${searchErr.message}`));
              return;
            }

            if (uids.length === 0) {
              imap.end();
              resolve([]);
              return;
            }

            // 取最新的 N 封邮件
            const targetUids = uids.slice(-(params.limit ?? 10));
            const fetch = imap.fetch(targetUids, {
              bodies: "",
              struct: true,
            });

            fetch.on("message", (msg) => {
              let body = "";

              msg.on("body", (stream) => {
                stream.on("data", (chunk: Buffer) => {
                  body += chunk.toString("utf8");
                });
              });

              msg.once("attributes", (attrs) => {
                const uid = attrs.uid;
              });

              msg.once("end", () => {
                // 解析邮件
                simpleParser(body, (parseErr, parsed) => {
                  if (parseErr) {
                    console.warn("[Email] 邮件解析失败:", parseErr.message);
                    return;
                  }

                  messages.push({
                    id: parsed.messageId ?? `imap_${Date.now()}_${messages.length}`,
                    from: parsed.from?.text ?? "",
                    to: extractAddresses(parsed.to),
                    cc: extractAddresses(parsed.cc),
                    subject: parsed.subject ?? "(无主题)",
                    date: parsed.date?.toISOString() ?? new Date().toISOString(),
                    body: parsed.text ?? "",
                    html: parsed.html || undefined,
                    attachments: parsed.attachments?.map((att) => ({
                      filename: att.filename ?? "attachment",
                      contentType: att.contentType,
                      size: att.size,
                    })),
                  });
                });
              });
            });

            fetch.once("error", (fetchErr) => {
              reject(new Error(`邮件获取失败: ${fetchErr.message}`));
            });

            fetch.once("end", () => {
              imap.end();
            });
          });
        });
      });

      imap.once("error", (err) => {
        reject(new Error(`IMAP 连接失败: ${err.message}`));
      });

      imap.once("end", () => {
        // 按日期倒序排列
        messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(messages);
      });

      imap.connect();
    });
  }
}

/**
 * 邮件搜索执行器（真实 IMAP）
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

      const cred: ImapCredential = JSON.parse(credData.data) as ImapCredential;
      const emails = await this.imapSearch(cred, {
        criteria: p.criteria,
        folder: p.folder ?? "INBOX",
        limit: p.limit ?? 20,
      });

      return {
        success: true,
        data: { emails, total: emails.length },
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

  private imapSearch(cred: ImapCredential, params: {
    criteria: string;
    folder: string;
    limit: number;
  }): Promise<EmailMessage[]> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: cred.imapUser,
        password: cred.imapPassword,
        host: cred.imapHost,
        port: cred.imapPort,
        tls: cred.imapSecure,
        tlsOptions: { rejectUnauthorized: false },
      });

      const messages: EmailMessage[] = [];

      imap.once("ready", () => {
        imap.openBox(params.folder, false, (err) => {
          if (err) {
            imap.end();
            reject(new Error(`无法打开邮箱: ${err.message}`));
            return;
          }

          // 将 IMAP 标准搜索字符串解析为数组
          const criteriaParts = params.criteria
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part.toUpperCase());

          // 构建搜索条件
          const searchCriteria: unknown[] = [];
          let i = 0;
          while (i < criteriaParts.length) {
            if (criteriaParts[i] === "UNSEEN" || criteriaParts[i] === "SEEN" ||
                criteriaParts[i] === "ANSWERED" || criteriaParts[i] === "FLAGGED" ||
                criteriaParts[i] === "DELETED" || criteriaParts[i] === "DRAFT") {
              searchCriteria.push([criteriaParts[i]!]);
              i++;
            } else if (criteriaParts[i] === "FROM" || criteriaParts[i] === "TO" ||
                       criteriaParts[i] === "SUBJECT" || criteriaParts[i] === "BODY" ||
                       criteriaParts[i] === "TEXT") {
              const key = criteriaParts[i]!;
              i++;
              const value: string[] = [];
              while (i < criteriaParts.length &&
                     criteriaParts[i] !== "FROM" && criteriaParts[i] !== "TO" &&
                     criteriaParts[i] !== "SUBJECT" && criteriaParts[i] !== "BODY" &&
                     criteriaParts[i] !== "TEXT" && criteriaParts[i] !== "UNSEEN" &&
                     criteriaParts[i] !== "SEEN") {
                value.push(criteriaParts[i]!);
                i++;
              }
              if (value.length > 0) {
                searchCriteria.push(["HEADER", key, value.join(" ")]);
              }
            } else if (criteriaParts[i] === "SINCE" || criteriaParts[i] === "BEFORE") {
              const key = criteriaParts[i]!;
              i++;
              if (i < criteriaParts.length) {
                searchCriteria.push([key, criteriaParts[i]!]);
                i++;
              }
            } else {
              // 跳过无法识别的标记，尝试作为文本搜索
              const textParts: string[] = [];
              while (i < criteriaParts.length &&
                     !["FROM", "TO", "SUBJECT", "BODY", "TEXT", "UNSEEN", "SEEN",
                       "SINCE", "BEFORE"].includes(criteriaParts[i]!)) {
                textParts.push(criteriaParts[i]!);
                i++;
              }
              if (textParts.length > 0) {
                searchCriteria.push(["TEXT", textParts.join(" ")]);
              }
            }
          }

          const criteria = searchCriteria.length > 0 ? searchCriteria : ["ALL"];

          imap.search(criteria, (searchErr, uids) => {
            if (searchErr) {
              imap.end();
              reject(new Error(`搜索失败: ${searchErr.message}`));
              return;
            }

            if (uids.length === 0) {
              imap.end();
              resolve([]);
              return;
            }

            const targetUids = uids.slice(-(params.limit));
            const fetch = imap.fetch(targetUids, { bodies: "", struct: true });

            fetch.on("message", (msg) => {
              let body = "";
              msg.on("body", (stream) => {
                stream.on("data", (chunk: Buffer) => { body += chunk.toString("utf8"); });
              });
              msg.once("end", () => {
                simpleParser(body, (_parseErr, parsed) => {
                  messages.push({
                    id: parsed.messageId ?? `imap_${Date.now()}_${messages.length}`,
                    from: parsed.from?.text ?? "",
                    to: extractAddresses(parsed.to),
                    subject: parsed.subject ?? "(无主题)",
                    date: parsed.date?.toISOString() ?? new Date().toISOString(),
                    body: parsed.text ?? "",
                  });
                });
              });
            });

            fetch.once("error", (fetchErr) => {
              reject(new Error(`邮件获取失败: ${fetchErr.message}`));
            });

            fetch.once("end", () => { imap.end(); });
          });
        });
      });

      imap.once("error", (err) => { reject(new Error(`IMAP 连接失败: ${err.message}`)); });
      imap.once("end", () => {
        messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(messages);
      });
      imap.connect();
    });
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
