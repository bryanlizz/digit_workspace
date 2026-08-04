// ─────────────────────────────────────────────────────────
// 数智企业 · 服务端 API Key 存储
// 使用 Prisma Credential 表持久化，兼容现有 Credential Vault
// ─────────────────────────────────────────────────────────

import { db } from "~/server/db";
import { DEFAULT_TENANT_ID } from "~/lib/data";
import type { KeyConfig } from "./aiGateway";

export class ServerKeyStore {
  async loadKeys(): Promise<KeyConfig[]> {
    try {
      const credentials = await db.credential.findMany({
        where: {
          tenantId: DEFAULT_TENANT_ID,
          systemType: "ai_gateway",
          isActive: true,
        },
      });

      return credentials.map((cred) => {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(cred.encryptedData) as Record<string, unknown>;
        } catch {
          // ignore parse errors
        }

        return {
          id: cred.id,
          provider: (parsed.provider as KeyConfig["provider"]) ?? "openai",
          key: (parsed.key as string) ?? "",
          label: cred.name,
          isActive: cred.isActive,
          quota: (parsed.quota as KeyConfig["quota"]) ?? {
            monthlyLimit: 100000,
            used: 0,
            remaining: 100000,
          },
          rateLimit: (parsed.rateLimit as KeyConfig["rateLimit"]) ?? {
            rpm: 60,
            current: 0,
            resetAt: Date.now() + 60000,
          },
        };
      });
    } catch {
      return [];
    }
  }

  async saveKey(key: KeyConfig): Promise<void> {
    try {
      await db.credential.upsert({
        where: { id: key.id },
        create: {
          id: key.id,
          tenantId: DEFAULT_TENANT_ID,
          name: key.label,
          type: "api_key",
          systemType: "ai_gateway",
          encryptedData: JSON.stringify({
            provider: key.provider,
            key: key.key,
            label: key.label,
            quota: key.quota,
            rateLimit: key.rateLimit,
          }),
          isActive: key.isActive,
        },
        update: {
          name: key.label,
          encryptedData: JSON.stringify({
            provider: key.provider,
            key: key.key,
            label: key.label,
            quota: key.quota,
            rateLimit: key.rateLimit,
          }),
          isActive: key.isActive,
        },
      });
    } catch {
      console.error(`[ServerKeyStore] Failed to save key: ${key.label}`);
    }
  }

  async deleteKey(id: string): Promise<void> {
    try {
      await db.credential.delete({ where: { id } });
    } catch {
      // ignore
    }
  }
}
