// ─────────────────────────────────────────────────────────
// 数智企业 · Prisma 作战室消息仓库
// ─────────────────────────────────────────────────────────

import { db } from "~/server/db";
import type { Prisma } from "@lobster/db";
import type { WarRoomMessageDTO } from "@lobster/types";
import type { IWarRoomMessageRepository, CreateWarRoomMessageInput } from "../mock/warRoomMessage.repo";

const messageInclude = {
  project: true,
} as const;

type MessageWithRelations = Prisma.WarRoomMessageGetPayload<{ include: typeof messageInclude }>;

function toDTO(msg: MessageWithRelations): WarRoomMessageDTO {
  let metadata: Record<string, unknown> | null = null;
  if (msg.metadata) {
    try { metadata = JSON.parse(msg.metadata) as Record<string, unknown>; } catch { metadata = null; }
  }

  return {
    id: msg.id,
    projectId: msg.projectId,
    senderType: msg.senderType as WarRoomMessageDTO["senderType"],
    senderId: msg.senderId,
    senderName: msg.senderName,
    avatar: msg.avatar ?? null,
    content: msg.content,
    messageType: msg.messageType as WarRoomMessageDTO["messageType"],
    metadata,
    createdAt: msg.createdAt.toISOString(),
  };
}

export class PrismaWarRoomMessageRepository implements IWarRoomMessageRepository {
  async create(data: CreateWarRoomMessageInput): Promise<WarRoomMessageDTO> {
    const msg = await db.warRoomMessage.create({
      data: {
        projectId: data.projectId,
        senderType: data.senderType,
        senderId: data.senderId,
        senderName: data.senderName,
        avatar: data.avatar ?? null,
        content: data.content,
        messageType: data.messageType ?? "text",
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
      include: messageInclude,
    });
    return toDTO(msg);
  }

  async findByProject(projectId: string, limit = 50, offset = 0): Promise<WarRoomMessageDTO[]> {
    const messages = await db.warRoomMessage.findMany({
      where: { projectId },
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
    return messages.map(toDTO);
  }

  async countByProject(projectId: string): Promise<number> {
    return db.warRoomMessage.count({ where: { projectId } });
  }
}

export const warRoomMessageRepo = new PrismaWarRoomMessageRepository();
