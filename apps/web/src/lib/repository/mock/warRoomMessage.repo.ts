// ─────────────────────────────────────────────────────────
// 数智企业 · 作战室消息仓库
// ─────────────────────────────────────────────────────────

import type { WarRoomMessageDTO } from "@lobster/types";
import { DEFAULT_TENANT_ID } from "~/lib/data";

export interface CreateWarRoomMessageInput {
  projectId: string;
  senderType: "human" | "agent" | "system";
  senderId: string;
  senderName: string;
  avatar?: string;
  content: string;
  messageType?: "text" | "image" | "file" | "action";
  metadata?: Record<string, unknown>;
}

export interface IWarRoomMessageRepository {
  create(data: CreateWarRoomMessageInput): Promise<WarRoomMessageDTO>;
  findByProject(projectId: string, limit?: number, offset?: number): Promise<WarRoomMessageDTO[]>;
  countByProject(projectId: string): Promise<number>;
}

export class MockWarRoomMessageRepository implements IWarRoomMessageRepository {
  private messages: Map<string, WarRoomMessageDTO>;

  constructor() {
    this.messages = new Map();
  }

  async create(data: CreateWarRoomMessageInput): Promise<WarRoomMessageDTO> {
    const id = `wrm-${crypto.randomUUID().slice(0, 8)}`;
    const message: WarRoomMessageDTO = {
      id,
      projectId: data.projectId,
      senderType: data.senderType,
      senderId: data.senderId,
      senderName: data.senderName,
      avatar: data.avatar ?? null,
      content: data.content,
      messageType: data.messageType ?? "text",
      metadata: data.metadata ?? null,
      createdAt: new Date().toISOString(),
    };
    this.messages.set(id, message);
    return message;
  }

  async findByProject(projectId: string, limit = 50, offset = 0): Promise<WarRoomMessageDTO[]> {
    const all = Array.from(this.messages.values())
      .filter((m) => m.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return all.slice(offset, offset + limit);
  }

  async countByProject(projectId: string): Promise<number> {
    return Array.from(this.messages.values())
      .filter((m) => m.projectId === projectId)
      .length;
  }
}

export const warRoomMessageRepo = new MockWarRoomMessageRepository();