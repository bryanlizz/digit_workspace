// ─────────────────────────────────────────────────────────
// 数智企业 · Vault Service
// 凭证加密存储与管理
// ─────────────────────────────────────────────────────────

import { db as prisma } from "~/server/db";
import crypto from "crypto";

// 加密配置
const ALGORITHM = "aes-256-gcm";
// 注意：实际生产环境应从环境变量或密钥管理服务获取
const ENCRYPTION_KEY = process.env.VAULT_ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex").slice(0, 32);

export class VaultService {
  /**
   * 加密凭证数据
   */
  private encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  /**
   * 解密凭证数据（仅服务端内部使用）
   */
  private decrypt(ciphertext: string): string {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) {
      throw new Error("无效的加密数据格式");
    }
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex!, "hex");
    const authTag = Buffer.from(authTagHex!, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted!, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  /**
   * 创建凭证
   */
  async createCredential(input: {
    tenantId: string;
    name: string;
    type: string;
    systemType: string;
    credentialData: string;
    ownerId?: string;
    agentIds?: string[];
    expiresAt?: Date;
    refreshToken?: string;
  }) {
    const encryptedData = this.encrypt(input.credentialData);
    const encryptedRefreshToken = input.refreshToken
      ? this.encrypt(input.refreshToken)
      : null;

    return prisma.credential.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        type: input.type,
        systemType: input.systemType,
        encryptedData,
        ownerId: input.ownerId,
        agentIds: JSON.stringify(input.agentIds ?? []),
        expiresAt: input.expiresAt,
        refreshToken: encryptedRefreshToken,
      },
    });
  }

  /**
   * 获取凭证列表（不包含明文）
   */
  async listCredentials(tenantId: string) {
    const creds = await prisma.credential.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return creds.map((c: (typeof creds)[number]) => ({
      id: c.id,
      tenantId: c.tenantId,
      name: c.name,
      type: c.type,
      systemType: c.systemType,
      ownerId: c.ownerId,
      agentIds: JSON.parse(c.agentIds) as string[],
      isActive: c.isActive,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      lastUsedAt: c.lastUsedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  /**
   * 获取单个凭证（不包含明文）
   */
  async getCredential(credentialId: string) {
    const cred = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!cred) return null;

    return {
      id: cred.id,
      tenantId: cred.tenantId,
      name: cred.name,
      type: cred.type,
      systemType: cred.systemType,
      ownerId: cred.ownerId,
      agentIds: JSON.parse(cred.agentIds) as string[],
      isActive: cred.isActive,
      expiresAt: cred.expiresAt?.toISOString() ?? null,
      lastUsedAt: cred.lastUsedAt?.toISOString() ?? null,
      createdAt: cred.createdAt.toISOString(),
      updatedAt: cred.updatedAt.toISOString(),
    };
  }

  /**
   * 获取凭证数据（解密，仅限授权 Agent 使用）
   * 注意：这个方法应该由 Tool Executor 内部调用，不暴露给前端
   */
  async getCredentialData(credentialId: string, requesterAgentId: string): Promise<{
    data: string;
    type: string;
    refreshToken?: string;
  } | null> {
    const cred = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!cred || !cred.isActive) return null;

    // 检查是否授权给该 Agent
    const agentIds = JSON.parse(cred.agentIds) as string[];
    if (!agentIds.includes(requesterAgentId) && !agentIds.includes("*")) {
      console.warn(`[Vault] Agent ${requesterAgentId} 未授权访问凭证 ${credentialId}`);
      return null;
    }

    // 检查是否过期
    if (cred.expiresAt && cred.expiresAt < new Date()) {
      console.warn(`[Vault] 凭证 ${credentialId} 已过期`);
      return null;
    }

    // 更新最后使用时间
    await prisma.credential.update({
      where: { id: credentialId },
      data: { lastUsedAt: new Date() },
    });

    // 解密数据
    try {
      const decryptedData = this.decrypt(cred.encryptedData);
      const decryptedRefreshToken = cred.refreshToken
        ? this.decrypt(cred.refreshToken)
        : undefined;

      return {
        data: decryptedData,
        type: cred.type,
        refreshToken: decryptedRefreshToken,
      };
    } catch (error) {
      console.error(`[Vault] 解密凭证 ${credentialId} 失败:`, error);
      return null;
    }
  }

  /**
   * 删除凭证（软删除）
   */
  async deleteCredential(credentialId: string) {
    return prisma.credential.update({
      where: { id: credentialId },
      data: { isActive: false },
    });
  }

  /**
   * 更新凭证
   */
  async updateCredential(credentialId: string, input: {
    name?: string;
    credentialData?: string;
    ownerId?: string;
    agentIds?: string[];
    expiresAt?: Date;
    refreshToken?: string;
  }) {
    const updateData: Record<string, unknown> = {};

    if (input.name) updateData.name = input.name;
    if (input.ownerId !== undefined) updateData.ownerId = input.ownerId;
    if (input.agentIds) updateData.agentIds = JSON.stringify(input.agentIds);
    if (input.expiresAt !== undefined) updateData.expiresAt = input.expiresAt;

    if (input.credentialData) {
      updateData.encryptedData = this.encrypt(input.credentialData);
    }
    if (input.refreshToken !== undefined) {
      updateData.refreshToken = input.refreshToken
        ? this.encrypt(input.refreshToken)
        : null;
    }

    return prisma.credential.update({
      where: { id: credentialId },
      data: updateData,
    });
  }

  /**
   * 检查凭证是否需要刷新（OAuth）
   */
  async needsRefresh(credentialId: string): Promise<boolean> {
    const cred = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!cred || cred.type !== "oauth") return false;

    // 如果有 refresh token 且凭证即将过期，需要刷新
    if (cred.refreshToken && cred.expiresAt) {
      const expiresAt = new Date(cred.expiresAt);
      const now = new Date();
      // 提前 1 小时刷新
      expiresAt.setHours(expiresAt.getHours() - 1);
      return now >= expiresAt;
    }

    return false;
  }
}

export const vaultService = new VaultService();
