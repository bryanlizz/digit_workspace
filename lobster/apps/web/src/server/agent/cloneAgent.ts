// ─────────────────────────────────────────────────────────
// 数智企业 · Agent 克隆
// ─────────────────────────────────────────────────────────

import { db } from "~/server/db";
import { agentRepo } from "~/lib/repository";
import type { AgentDTO } from "@lobster/types";

export async function cloneAgent(sourceAgentId: string, newName?: string): Promise<AgentDTO> {
  const source = await agentRepo.findById(sourceAgentId);
  if (!source) throw new Error(`Agent ${sourceAgentId} 不存在`);

  const coreMemory = await agentRepo.getCoreMemory(sourceAgentId);

  return agentRepo.create({
    name: newName ?? `${source.name} (副本)`,
    type: source.type,
    ownerId: source.ownerId,
    presetRoleId: source.presetRoleId ?? undefined,
    skillTags: source.skillTags,
    permissionBm: source.permissionBm,
    coreMemory: coreMemory ? {
      roleDefinition: coreMemory.roleDefinition,
      experienceSummary: coreMemory.experienceSummary ?? undefined,
    } : undefined,
  });
}
