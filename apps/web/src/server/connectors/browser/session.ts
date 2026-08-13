// ─────────────────────────────────────────────────────────
// 浏览器会话管理
// 管理浏览器会话、登录态持久化
// ─────────────────────────────────────────────────────────

import { randomUUID } from "crypto";
import { vaultService } from "~/server/vault";
import type { BrowserSession, ProxyConfig, BossUserInfo } from "./types";

/**
 * 浏览器会话管理器
 */
export class BrowserSessionManager {
  private sessions: Map<string, BrowserSession> = new Map();
  private bossCookieCredentials: Map<string, string> = new Map();

  /**
   * 创建新会话
   */
  async createSession(label: string, tenantId: string, proxy?: ProxyConfig): Promise<BrowserSession> {
    const session: BrowserSession = {
      id: randomUUID(),
      label,
      tenantId,
      proxy,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      isLoggedIn: false,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): BrowserSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 获取会话（按标签）
   */
  getSessionByLabel(label: string, tenantId: string): BrowserSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.label === label && session.tenantId === tenantId) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * 更新会话状态
   */
  updateSession(sessionId: string, updates: Partial<BrowserSession>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates, { lastActiveAt: new Date() });
    }
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.bossCookieCredentials.delete(sessionId);
  }

  /**
   * 获取租户的所有会话
   */
  getTenantSessions(tenantId: string): BrowserSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.tenantId === tenantId);
  }

  /**
   * 保存 Boss 登录态（Cookie）
   */
  async saveBossCookies(sessionId: string, agentId: string, cookies: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const credential = await vaultService.createCredential({
      tenantId: session.tenantId,
      name: `Boss 登录态 - ${session.label} - ${session.id}`,
      type: "browser_cookie",
      credentialData: cookies,
      agentIds: [agentId],
      systemType: "boss",
    });

    this.bossCookieCredentials.set(sessionId, credential.id);
    this.updateSession(sessionId, { cookieCredentialId: credential.id });
  }

  private parseAgentIds(raw: string): string[] {
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  /**
   * 获取 Boss 登录态
   */
  async getBossCookies(sessionId: string, agentId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const credentialId = this.bossCookieCredentials.get(sessionId) ?? session.cookieCredentialId;
    if (credentialId) {
      const data = await vaultService.getCredentialData(credentialId, agentId);
      if (data) return data.data;
    }

    const credentials = await vaultService.listCredentials(session.tenantId);
    const matched = credentials
      .filter((cred: (typeof credentials)[number]) => cred.agentIds.includes(agentId) || cred.agentIds.includes("*"))
      .sort((a: (typeof credentials)[number], b: (typeof credentials)[number]) => new Date(b.lastUsedAt ?? b.createdAt).getTime() - new Date(a.lastUsedAt ?? a.createdAt).getTime())
      .find((cred: (typeof credentials)[number]) => cred.name.includes(session.id) || cred.name.includes(session.label));

    if (!matched) return null;

    const data = await vaultService.getCredentialData(matched.id, agentId);
    if (!data) return null;

    this.bossCookieCredentials.set(sessionId, matched.id);
    this.updateSession(sessionId, { cookieCredentialId: matched.id });
    return data.data;
  }

  /**
   * 设置用户登录信息
   */
  setUserInfo(sessionId: string, userInfo: BossUserInfo): void {
    this.updateSession(sessionId, { userInfo, isLoggedIn: true });
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(maxIdleMinutes: number = 60): void {
    const now = new Date();
    for (const [id, session] of this.sessions.entries()) {
      const idleMs = now.getTime() - session.lastActiveAt.getTime();
      if (idleMs > maxIdleMinutes * 60 * 1000) {
        this.sessions.delete(id);
        this.bossCookieCredentials.delete(id);
      }
    }
  }
}

/**
 * 全局会话管理器实例
 */
export const sessionManager = new BrowserSessionManager();
