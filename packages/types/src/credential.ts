// ─────────────────────────────────────────────────────────
// 数智企业 · 凭证类型定义
// ─────────────────────────────────────────────────────────

/**
 * 凭证类型
 */
export type CredentialType = "api_key" | "password" | "oauth" | "cookie";

/**
 * 系统类型
 */
export type SystemType = "feishu" | "boss" | "email" | "crm" | "feishu_lark" | "dingding" | "wechat" | "jinshi" | "yonyou" | "other";

/**
 * 凭证 DTO — API 返回格式（不包含敏感数据）
 */
export interface CredentialDTO {
  id: string;
  tenantId: string;
  name: string;
  type: CredentialType;
  systemType: SystemType;
  ownerId: string | null;
  agentIds: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // 注意：不包含 encryptedData 和 refreshToken（不可见）
}

/**
 * 创建凭证的输入参数
 */
export interface CreateCredentialInput {
  name: string;
  type: CredentialType;
  systemType: SystemType;
  credentialData: string; // 原始凭证数据，内部加密
  ownerId?: string;
  agentIds?: string[];
  expiresAt?: string;
}

/**
 * 凭证筛选参数
 */
export interface CredentialFilter {
  tenantId?: string;
  ownerId?: string;
  systemType?: SystemType;
  type?: CredentialType;
  isActive?: boolean;
}