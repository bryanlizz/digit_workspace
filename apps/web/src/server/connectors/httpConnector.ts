// ─────────────────────────────────────────────────────────
// 数智企业 · HTTP Connector
// 通用 HTTP 请求能力
// ─────────────────────────────────────────────────────────

import { BaseToolExecutor } from "~/server/tools/registry";
import type { ToolDefinition, ToolCallResult, ToolCallContext } from "~/server/tools/types";
import { vaultService } from "~/server/vault";

interface HttpConnectorConfig {
  /** 基础 URL */
  baseUrl: string;
  /** 凭证 ID（从 Vault 获取） */
  credentialId?: string;
  /** 默认请求头 */
  defaultHeaders?: Record<string, string>;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 默认方法 */
  defaultMethod?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
}

interface HttpToolParams {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}

function getObjectId(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const id = (value as Record<string, unknown>).id;
  return typeof id === "string" ? id : undefined;
}

/**
 * HTTP Connector
 * 用于调用外部 HTTP API
 */
export class HttpConnector extends BaseToolExecutor {
  private config: Required<HttpConnectorConfig>;

  constructor(config: HttpConnectorConfig) {
    super();
    this.config = {
      baseUrl: config.baseUrl,
      credentialId: config.credentialId ?? "",
      defaultHeaders: config.defaultHeaders ?? {},
      timeout: config.timeout ?? 30000,
      defaultMethod: config.defaultMethod ?? "GET",
    };
  }

  async execute(
    definition: ToolDefinition,
    params: unknown,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const p = params as HttpToolParams;
    const startTime = Date.now();

    try {
      // 获取凭证（如果需要）
      let authHeaders: Record<string, string> = {};
      if (this.config.credentialId) {
        const cred = await vaultService.getCredentialData(
          this.config.credentialId,
          context.agentId
        );
        if (cred) {
          // 根据凭证类型设置认证头
          if (cred.type === "api_key") {
            authHeaders = { "X-API-Key": cred.data };
          } else {
            authHeaders = { Authorization: `Bearer ${cred.data}` };
          }
        }
      }

      // 构建 URL
      const url = new URL(p.path, this.config.baseUrl);
      if (p.query) {
        Object.entries(p.query).forEach(([k, v]) => {
          url.searchParams.append(k, v);
        });
      }

      // 构建请求头
      const headers = {
        "Content-Type": "application/json",
        ...this.config.defaultHeaders,
        ...authHeaders,
        ...(p.headers ?? {}),
      };

      // 发起请求
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url.toString(), {
        method: p.method ?? this.config.defaultMethod,
        headers,
        body: p.body ? JSON.stringify(p.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 解析响应
      let data: unknown;
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // 检查是否成功
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          data,
          executionTimeMs: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data,
        executionTimeMs: Date.now() - startTime,
        externalRecordId: this.extractRecordId(data, response.headers),
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          error: "请求超时",
          executionTimeMs: Date.now() - startTime,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "请求失败",
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 从响应中提取记录 ID
   */
  private extractRecordId(
    data: unknown,
    headers: Headers
  ): string | undefined {
    // 优先从 Location 头获取
    const location = headers.get("location");
    if (location) {
      return location.split("/").pop();
    }

    // 从响应体中提取
    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      return (
        getObjectId(obj) ??
        getObjectId(obj.data) ??
        getObjectId(obj.record) ??
        getObjectId(obj.result)
      );
    }

    return undefined;
  }
}

/**
 * 创建 HTTP Connector 工厂函数
 */
export function createHttpConnector(config: HttpConnectorConfig): HttpConnector {
  return new HttpConnector(config);
}