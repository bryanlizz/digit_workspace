// ─────────────────────────────────────────────────────────
// 数智企业 · 飞书文档 Tool
// 支持创建、追加内容、读取飞书文档
// ─────────────────────────────────────────────────────────

import type { ToolDefinition, ToolCallResult, ToolCallContext, IToolExecutor } from "~/server/tools/types";
import { env } from "~/env";

const FEISHU_BASE = "https://open.feishu.cn/open-apis";

interface FeishuDocTool {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
}

const docTools: FeishuDocTool[] = [
  {
    id: "feishu.doc.create",
    name: "创建飞书文档",
    description: "在飞书知识库中创建新文档",
    requiredLevel: 2,
  },
  {
    id: "feishu.doc.append",
    name: "追加飞书文档内容",
    description: "向已有飞书文档追加内容块",
    requiredLevel: 2,
  },
  {
    id: "feishu.doc.read",
    name: "读取飞书文档",
    description: "读取飞书文档的原始内容",
    requiredLevel: 1,
  },
];

class FeishuDocExecutor implements IToolExecutor {
  async execute(
    definition: ToolDefinition,
    params: Record<string, unknown>,
    _context: ToolCallContext,
  ): Promise<ToolCallResult> {
    const token = env.FEISHU_APP_TOKEN;
    if (!token) {
      return { success: false, error: "未配置飞书应用 Token (FEISHU_APP_TOKEN)", executionTimeMs: 0 };
    }

    try {
      switch (definition.id) {
        case "feishu.doc.create":
          return this.createDoc(token, params);
        case "feishu.doc.append":
          return this.appendDoc(token, params);
        case "feishu.doc.read":
          return this.readDoc(token, params);
        default:
          return { success: false, error: `未知工具: ${definition.id}`, executionTimeMs: 0 };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "飞书 API 调用失败",
        executionTimeMs: 0,
      };
    }
  }

  private async createDoc(token: string, params: Record<string, unknown>): Promise<ToolCallResult> {
    const title = String(params.title ?? "未命名文档");
    const folderToken = String(params.folderToken ?? "");
    const content = String(params.content ?? "");

    const body: Record<string, unknown> = { title };
    if (folderToken) body.folder_token = folderToken;

    const resp = await fetch(`${FEISHU_BASE}/docx/v1/documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json() as Record<string, unknown>;
    if (!resp.ok) throw new Error(`创建飞书文档失败: ${JSON.stringify(data)}`);

    const docData = (data.data as Record<string, unknown> | undefined) ?? {};
    const docId = (docData.document as Record<string, unknown> | undefined)?.document_id as string;

    // Append initial content if provided
    if (content && docId) {
      await this.appendBlocks(token, docId, content);
    }

    return {
      success: true,
      data: { documentId: docId, title, url: `https://bytedance.feishu.cn/docx/${docId}` },
      executionTimeMs: 0,
    };
  }

  private async appendDoc(token: string, params: Record<string, unknown>): Promise<ToolCallResult> {
    const docId = String(params.documentId ?? "");
    const content = String(params.content ?? "");
    if (!docId || !content) {
      return { success: false, error: "documentId 和 content 为必填参数", executionTimeMs: 0 };
    }

    await this.appendBlocks(token, docId, content);
    return { success: true, data: { documentId: docId }, executionTimeMs: 0 };
  }

  private async readDoc(token: string, params: Record<string, unknown>): Promise<ToolCallResult> {
    const docId = String(params.documentId ?? "");
    if (!docId) {
      return { success: false, error: "documentId 为必填参数", executionTimeMs: 0 };
    }

    const resp = await fetch(`${FEISHU_BASE}/docx/v1/documents/${docId}/raw_content`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await resp.json() as Record<string, unknown>;
    if (!resp.ok) throw new Error(`读取飞书文档失败: ${JSON.stringify(data)}`);

    return {
      success: true,
      data: { documentId: docId, content: (data.data as Record<string, unknown>)?.content },
      executionTimeMs: 0,
    };
  }

  private async appendBlocks(token: string, docId: string, content: string): Promise<void> {
    const blocks = content.split("\n").filter(Boolean).map((line, i) => ({
      block_id: `block_${Date.now()}_${i}`,
      block_type: 2, // text block
      text: {
        elements: [{ text_run: { content: line } }],
        style: {},
      },
    }));

    await fetch(`${FEISHU_BASE}/docx/v1/documents/${docId}/blocks/${docId}/children`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ children: blocks }),
    });
  }

  validate(params: unknown, definition: ToolDefinition): boolean {
    if (typeof params !== "object" || params === null) return false;
    const p = params as Record<string, unknown>;
    for (const param of definition.parameters) {
      if (param.required && p[param.name] === undefined) return false;
    }
    return true;
  }
}

export function registerFeishuDocTools(): void {
  // Registration happens in tool bootstrap (registerFeishuDocTools.ts is imported at startup)
}

export { docTools, FeishuDocExecutor };
