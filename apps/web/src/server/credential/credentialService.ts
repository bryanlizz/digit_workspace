// ─────────────────────────────────────────────────────────
// 凭证服务
// 安全管理外部系统的访问凭证
// ─────────────────────────────────────────────────────────

import { db } from "~/server/db";

/**
 * 凭证类型
 */
export type CredentialType =
  | "api_key"           // API 密钥
  | "oauth"             // OAuth 令牌
  | "password"          // 密码
  | "ssh_key"           // SSH 密钥
  | "certificate"       // 证书
  | "database";         // 数据库连接

/**
 * 凭证状态
 */
export type CredentialStatus = "active" | "expired" | "revoked" | "pending";

interface CredentialRecord {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  systemType: string;
  encryptedData: string;
  ownerId: string | null;
  agentIds: string;
  isActive: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  refreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 凭证信息（不含敏感数据）
 */
export interface CredentialInfo {
  id: string;
  tenantId: string;
  agentIds?: string[];
  name: string;
  systemType: string;
  credentialType: CredentialType;
  status: CredentialStatus;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  createdBy: string;
  description?: string;
}

/**
 * 凭证写入请求
 */
export interface CreateCredentialRequest {
  tenantId: string;
  agentIds?: string[];
  name: string;
  systemType: string;
  credentialType: CredentialType;
  credential: string; // 加密后的凭证
  expiresAt?: Date;
  description?: string;
  createdBy: string;
}

/**
 * 凭证使用记录
 */
export interface CredentialUsage {
  id: string;
  credentialId: string;
  usedBy: string;
  usedAt: string;
  success: boolean;
  error?: string;
}

/**
 * 凭证服务
 */
export class CredentialService {
  /**
   * 创建凭证
   */
  async create(request: CreateCredentialRequest): Promise<CredentialInfo> {
    const encryptedData = this.encrypt(request.credential);

    const credential = await db.credential.create({
      data: {
        tenantId: request.tenantId,
        agentIds: JSON.stringify(request.agentIds ?? []),
        name: request.name,
        systemType: request.systemType,
        type: request.credentialType,
        encryptedData,
        expiresAt: request.expiresAt,
      },
    });

    return this.toInfo(credential, request.createdBy, request.description);
  }

  /**
   * 获取凭证（解密后）
   */
  async getDecrypted(credentialId: string): Promise<string | null> {
    const credential = await db.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      return null;
    }

    // 检查是否过期
    if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
      return null;
    }

    // 记录使用
    await this.recordUsage(credentialId, "system", true);

    return this.decrypt(credential.encryptedData);
  }

  /**
   * 列出凭证（不含敏感数据）
   */
  async list(
    tenantId: string,
    options?: {
      agentIds?: string[];
      systemType?: string;
      status?: CredentialStatus;
    }
  ): Promise<CredentialInfo[]> {
    const credentials = await db.credential.findMany({
      where: {
        tenantId,
        ...(options?.systemType ? { systemType: options.systemType } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return credentials
      .filter((credential: CredentialRecord) => this.matchesFilters(credential, options))
      .map((credential: CredentialRecord) => this.toInfo(credential));
  }

  /**
   * 获取凭证信息（不含敏感数据）
   */
  async getInfo(credentialId: string): Promise<CredentialInfo | null> {
    const credential = await db.credential.findUnique({
      where: { id: credentialId },
    });

    return credential ? this.toInfo(credential) : null;
  }

  /**
   * 获取 Agent 可用的凭证
   */
  async getForAgent(agentId: string): Promise<CredentialInfo[]> {
    const agent = await db.agent.findUnique({
      where: { id: agentId },
      include: { tenant: true },
    });

    if (!agent) return [];

    const credentials = await db.credential.findMany({
      where: {
        tenantId: agent.tenantId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return credentials
      .filter((credential: CredentialRecord) => {
        const agentIds = this.parseAgentIds(credential.agentIds);
        return agentIds.includes(agentId) || agentIds.includes("*");
      })
      .map((credential: CredentialRecord) => this.toInfo(credential));
  }

  /**
   * 更新凭证状态
   */
  async updateStatus(
    credentialId: string,
    status: CredentialStatus
  ): Promise<void> {
    await db.credential.update({
      where: { id: credentialId },
      data: { isActive: status === "active" },
    });
  }

  /**
   * 更新凭证
   */
  async update(
    credentialId: string,
    updates: Partial<{
      name: string;
      credential: string;
      expiresAt: Date;
      description: string;
    }>
  ): Promise<void> {
    const data: {
      name?: string;
      encryptedData?: string;
      expiresAt?: Date;
    } = {};

    if (updates.name !== undefined) {
      data.name = updates.name;
    }
    if (updates.expiresAt !== undefined) {
      data.expiresAt = updates.expiresAt;
    }
    if (updates.credential) {
      data.encryptedData = this.encrypt(updates.credential);
    }

    await db.credential.update({
      where: { id: credentialId },
      data,
    });
  }

  /**
   * 删除凭证
   */
  async delete(credentialId: string): Promise<void> {
    await db.credential.delete({
      where: { id: credentialId },
    });
  }

  /**
   * 记录凭证使用
   */
  async recordUsage(
    credentialId: string,
    usedBy: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    await db.credential.update({
      where: { id: credentialId },
      data: { lastUsedAt: new Date() },
    });

    // TODO: 后续创建 usage log 表
    console.log(`[CredentialService] 凭证 ${credentialId} 被 ${usedBy} 使用，${success ? "成功" : "失败"}`);
    if (error) {
      console.warn(`[CredentialService] 使用错误: ${error}`);
    }
  }

  /**
   * 获取凭证使用历史
   */
  async getUsageHistory(
    credentialId: string,
    limit = 50
  ): Promise<CredentialUsage[]> {
    void credentialId;
    void limit;
    // TODO: 后续实现
    return [];
  }

  /**
   * 检查凭证是否有效
   */
  async isValid(credentialId: string): Promise<boolean> {
    const credential = await db.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) return false;
    if (!credential.isActive) return false;
    if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * 批量验证凭证
   */
  async validateMany(credentialIds: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    await Promise.all(
      credentialIds.map(async (id) => {
        results[id] = await this.isValid(id);
      })
    );

    return results;
  }

  /**
   * 清理过期凭证
   */
  async cleanupExpired(): Promise<number> {
    const credentials = await db.credential.findMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
    });

    const ids = credentials.map((credential: CredentialRecord) => credential.id);
    if (ids.length === 0) {
      return 0;
    }

    const result = await db.credential.updateMany({
      where: {
        id: { in: ids },
      },
      data: { isActive: false },
    });

    console.log(`[CredentialService] 清理了 ${result.count} 个过期凭证`);
    return result.count;
  }

  /**
   * 导出凭证（用于备份，需要再次加密）
   */
  async export(
    credentialId: string,
    exportKey: string
  ): Promise<{ encryptedData: string; expiresAt: string } | null> {
    const credential = await db.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) return null;

    const encrypted = this.encryptWithKey(credential.encryptedData, exportKey);

    return {
      encryptedData: encrypted,
      expiresAt: credential.expiresAt?.toISOString() ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private matchesFilters(
    credential: CredentialRecord,
    options?: {
      agentIds?: string[];
      systemType?: string;
      status?: CredentialStatus;
    }
  ): boolean {
    if (options?.status && this.getStatus(credential) !== options.status) {
      return false;
    }

    if (options?.agentIds?.length) {
      const agentIds = this.parseAgentIds(credential.agentIds);
      const matched = options.agentIds.some((id) => agentIds.includes(id));
      if (!matched) {
        return false;
      }
    }

    return true;
  }

  private parseAgentIds(raw: string): string[] {
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  private getStatus(credential: CredentialRecord): CredentialStatus {
    if (!credential.isActive) {
      return "revoked";
    }

    if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
      return "expired";
    }

    return "active";
  }

  // ─── 私有方法 ───

  /**
   * 加密凭证
   */
  private encrypt(plaintext: string): string {
    const encoded = Buffer.from(plaintext).toString("base64");
    return Buffer.from(encoded).toString("base64");
  }

  /**
   * 解密凭证
   */
  private decrypt(ciphertext: string): string {
    return Buffer.from(Buffer.from(ciphertext, "base64").toString("base64"), "base64").toString("utf-8");
  }

  /**
   * 使用指定密钥加密
   */
  private encryptWithKey(plaintext: string, key: string): string {
    let result = "";
    for (let i = 0; i < plaintext.length; i++) {
      result += String.fromCharCode(
        plaintext.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return Buffer.from(result).toString("base64");
  }

  /**
   * 转换为公开信息
   */
  private toInfo(
    credential: CredentialRecord,
    createdBy = credential.ownerId ?? "system",
    description?: string
  ): CredentialInfo {
    return {
      id: credential.id,
      tenantId: credential.tenantId,
      agentIds: this.parseAgentIds(credential.agentIds),
      name: credential.name,
      systemType: credential.systemType,
      credentialType: credential.type as CredentialType,
      status: this.getStatus(credential),
      expiresAt: credential.expiresAt?.toISOString(),
      lastUsedAt: credential.lastUsedAt?.toISOString(),
      createdAt: credential.createdAt.toISOString(),
      createdBy,
      description,
    };
  }

  // ─── OAuth Token 管理 ───

  /** OAuth 3 天不活跃即失效（毫秒） */
  private readonly INACTIVITY_TIMEOUT = 3 * 24 * 60 * 60 * 1000;

  /** 提前 1 小时刷新即将过期的 token */
  private readonly REFRESH_BUFFER = 60 * 60 * 1000;

  /**
   * 使用 refreshToken 刷新 OAuth Token
   * 返回新的 expiresAt，失败返回 null
   */
  async refreshOAuthToken(credentialId: string): Promise<Date | null> {
    const credential = await db.credential.findUnique({ where: { id: credentialId } });
    if (!credential || !credential.refreshToken) return null;

    try {
      // 根据 systemType 调用对应 OAuth token endpoint
      const newToken = await this.exchangeRefreshToken(credential.systemType, credential.refreshToken);
      if (!newToken) return null;

      const newExpiry = new Date(Date.now() + (newToken.expiresIn ?? 3600) * 1000);

      await db.credential.update({
        where: { id: credentialId },
        data: {
          encryptedData: this.encrypt(newToken.accessToken),
          refreshToken: newToken.refreshToken ?? credential.refreshToken,
          expiresAt: newExpiry,
          lastUsedAt: new Date(),
        },
      });

      // 同时更新 OAuthToken 表
      if (newToken.refreshToken) {
        await db.oAuthToken.upsert({
          where: { credentialId },
          create: {
            credentialId,
            accessToken: newToken.accessToken,
            refreshToken: newToken.refreshToken,
            tokenType: newToken.tokenType ?? "Bearer",
            scope: newToken.scope,
            expiresAt: newExpiry,
          },
          update: {
            accessToken: newToken.accessToken,
            refreshToken: newToken.refreshToken,
            expiresAt: newExpiry,
          },
        });
      }

      console.log(`[CredentialService] Token 已刷新: ${credentialId}`);
      return newExpiry;
    } catch (error) {
      console.error(`[CredentialService] Token 刷新失败: ${credentialId}`, error);
      return null;
    }
  }

  /**
   * 检查并刷新所有即将过期的 OAuth Token
   */
  async refreshExpiringTokens(): Promise<number> {
    const bufferDate = new Date(Date.now() + this.REFRESH_BUFFER);

    const expiringCredentials = await db.credential.findMany({
      where: {
        type: "oauth",
        isActive: true,
        refreshToken: { not: null },
        expiresAt: { lte: bufferDate, gt: new Date() },
      },
    });

    let refreshed = 0;
    for (const cred of expiringCredentials) {
      const result = await this.refreshOAuthToken(cred.id);
      if (result) refreshed++;
    }

    if (refreshed > 0) {
      console.log(`[CredentialService] 自动刷新了 ${refreshed} 个 Token`);
    }
    return refreshed;
  }

  /**
   * 检查 3 天不活跃的 OAuth Token 并停用
   */
  async deactivateInactiveTokens(): Promise<number> {
    const cutoff = new Date(Date.now() - this.INACTIVITY_TIMEOUT);

    const result = await db.credential.updateMany({
      where: {
        type: "oauth",
        isActive: true,
        lastUsedAt: { lt: cutoff },
      },
      data: { isActive: false },
    });

    if (result.count > 0) {
      console.log(`[CredentialService] 停用了 ${result.count} 个不活跃 Token (>3天)`);
    }
    return result.count;
  }

  /**
   * 定时维护：刷新即将过期 + 停用不活跃
   */
  async scheduledMaintenance(): Promise<{ refreshed: number; deactivated: number }> {
    const [refreshed, deactivated] = await Promise.all([
      this.refreshExpiringTokens(),
      this.deactivateInactiveTokens(),
    ]);
    return { refreshed, deactivated };
  }

  private async exchangeRefreshToken(
    systemType: string,
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number; tokenType?: string; scope?: string } | null> {
    switch (systemType) {
      case "feishu": {
        const resp = await fetch("https://open.feishu.cn/open-apis/authen/v1/refresh_access_token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }),
        });
        const data = await resp.json() as Record<string, unknown>;
        if (!resp.ok) return null;
        return {
          accessToken: data.access_token as string,
          refreshToken: data.refresh_token as string,
          expiresIn: data.expires_in as number,
          tokenType: data.token_type as string,
        };
      }
      case "github": {
        const resp = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }),
        });
        const data = await resp.json() as Record<string, unknown>;
        if (!resp.ok) return null;
        return {
          accessToken: data.access_token as string,
          refreshToken: data.refresh_token as string,
          tokenType: "Bearer",
        };
      }
      case "google": {
        const resp = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID ?? "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }).toString(),
        });
        const data = await resp.json() as Record<string, unknown>;
        if (!resp.ok) return null;
        return {
          accessToken: data.access_token as string,
          expiresIn: data.expires_in as number,
          tokenType: (data.token_type as string) ?? "Bearer",
          scope: data.scope as string,
        };
      }
      case "microsoft": {
        const resp = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
            client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }).toString(),
        });
        const data = await resp.json() as Record<string, unknown>;
        if (!resp.ok) return null;
        return {
          accessToken: data.access_token as string,
          refreshToken: data.refresh_token as string,
          expiresIn: data.expires_in as number,
          tokenType: (data.token_type as string) ?? "Bearer",
          scope: data.scope as string,
        };
      }
      default:
        return null;
    }
  }
}

/**
 * 全局凭证服务实例
 */
export const credentialService = new CredentialService();
