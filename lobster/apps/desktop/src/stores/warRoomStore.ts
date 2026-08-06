// ─────────────────────────────────────────────────────────
// 数智企业 · Desktop 作战室消息 Store
// ─────────────────────────────────────────────────────────

import { create } from "zustand";
import { trpc } from "../trpc";

// ─── 类型 ──────────────────────────────────────────────

export interface WarRoomMessage {
  id: string;
  projectId: string;
  senderType: "human" | "agent" | "system";
  senderId: string;
  senderName: string;
  avatar: string;
  content: string;
  messageType: "text" | "image" | "file" | "action";
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface UploadedFile {
  filename: string;
  savedName: string;
  size: number;
  mimeType: string;
  url: string;
}

interface SenderInfo {
  senderId: string;
  senderName: string;
  senderType: "human" | "agent" | "system";
}

interface WarRoomState {
  activeProjectId: string | null;
  messages: WarRoomMessage[];
  isLoadingMessages: boolean;

  setActiveProject: (id: string) => void;
  fetchMessages: () => Promise<void>;
  sendMessage: (content: string, senderInfo: SenderInfo) => Promise<void>;
  sendFileMessage: (files: UploadedFile[], content: string, senderInfo: SenderInfo) => Promise<void>;
  addMessage: (msg: WarRoomMessage) => void;
}

// ─── 工具函数 ──────────────────────────────────────────

function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function getApiBaseUrl(): string {
  return localStorage.getItem("lobster_api_url") ?? "http://localhost:3000";
}

function deriveAvatar(senderType: string, senderName: string): string {
  if (senderType === "system") return "🤖";
  if (senderType === "agent") return "🤖";
  return senderName.slice(0, 1) || "👤";
}

// ─── Store ─────────────────────────────────────────────

export const useWarRoomStore = create<WarRoomState>((set, get) => ({
  activeProjectId: null,
  messages: [],
  isLoadingMessages: false,

  setActiveProject: (id: string) => {
    set({ activeProjectId: id, messages: [] });
    void get().fetchMessages();
  },

  fetchMessages: async () => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;

    set({ isLoadingMessages: true });
    try {
      const result = await trpc.project.getMessages.query({
        projectId: activeProjectId,
        limit: 100,
        offset: 0,
      });

      const messages: WarRoomMessage[] = result.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        senderType: m.senderType,
        senderId: m.senderId,
        senderName: m.senderName,
        avatar: m.avatar ?? deriveAvatar(m.senderType, m.senderName),
        content: m.content,
        messageType: m.messageType,
        metadata: m.metadata,
        createdAt: m.createdAt,
      }));

      set({ messages, isLoadingMessages: false });
    } catch (error) {
      console.error("获取作战室消息失败:", error);
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (content, senderInfo) => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;

    const tempMsg: WarRoomMessage = {
      id: `temp-${shortId()}`,
      projectId: activeProjectId,
      senderType: senderInfo.senderType,
      senderId: senderInfo.senderId,
      senderName: senderInfo.senderName,
      avatar: deriveAvatar(senderInfo.senderType, senderInfo.senderName),
      content,
      messageType: "text",
      metadata: null,
      createdAt: new Date().toISOString(),
    };

    // 乐观更新
    set((state) => ({ messages: [...state.messages, tempMsg] }));

    try {
      await trpc.project.sendMessage.mutate({
        projectId: activeProjectId,
        senderType: senderInfo.senderType,
        senderId: senderInfo.senderId,
        senderName: senderInfo.senderName,
        content,
        messageType: "text",
      });
    } catch (error) {
      console.error("发送消息失败:", error);
      // 移除失败的临时消息
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== tempMsg.id),
      }));
    }
  },

  sendFileMessage: async (files, content, senderInfo) => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;

    const fileList = files.map((f) => ({
      filename: f.filename,
      size: f.size,
      mimeType: f.mimeType,
      url: `${getApiBaseUrl()}${f.url}`,
    }));

    const tempMsg: WarRoomMessage = {
      id: `temp-${shortId()}`,
      projectId: activeProjectId,
      senderType: senderInfo.senderType,
      senderId: senderInfo.senderId,
      senderName: senderInfo.senderName,
      avatar: deriveAvatar(senderInfo.senderType, senderInfo.senderName),
      content: content || fileList.map((f) => f.filename).join(", "),
      messageType: "file",
      metadata: { files: fileList },
      createdAt: new Date().toISOString(),
    };

    // 乐观更新
    set((state) => ({ messages: [...state.messages, tempMsg] }));

    try {
      await trpc.project.sendMessage.mutate({
        projectId: activeProjectId,
        senderType: senderInfo.senderType,
        senderId: senderInfo.senderId,
        senderName: senderInfo.senderName,
        content: tempMsg.content,
        messageType: "file",
        metadata: { files: fileList },
      });
    } catch (error) {
      console.error("发送文件消息失败:", error);
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== tempMsg.id),
      }));
    }
  },

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
}));
