import { create } from "zustand";

export interface WarRoomMessage {
  id: string;
  projectId: string;
  senderType: "human" | "agent" | "system";
  senderId: string;
  senderName: string;
  avatar: string;
  content: string;
  createdAt: string;
}

interface WarRoomState {
  activeProjectId: string | null;
  messages: WarRoomMessage[];
  projectContext: string;
  keyDecisions: Array<{ id: string; content: string; author: string; createdAt: string }>;
  isLoadingMessages: boolean;

  setActiveProject: (id: string | null) => void;
  fetchMessages: (projectId: string) => Promise<void>;
  addMessage: (msg: WarRoomMessage) => void;
  clearMessages: () => void;
  setProjectContext: (context: string) => void;
  addDecision: (decision: { content: string; author: string }) => void;
  sendMessage: (content: string, senderInfo: { senderId: string; senderName: string; senderType: "human" | "agent" }) => Promise<void>;
}

/** 生成短 ID */
function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

async function fetchProjectMessages(projectId: string) {
  const response = await fetch(`/api/trpc/project.getMessages?input=${encodeURIComponent(JSON.stringify({ json: { projectId, limit: 50, offset: 0 } }))}`);
  const payload = await response.json() as Array<{ result?: { data?: { json?: Array<Record<string, unknown>> } } }>;
  return (payload[0]?.result?.data?.json ?? []) as Array<{
    id: string;
    projectId: string;
    senderType: "human" | "agent" | "system";
    senderId: string;
    senderName: string;
    avatar?: string | null;
    content: string;
    createdAt: string;
  }>;
}

async function postProjectMessage(input: {
  projectId: string;
  senderType: "human" | "agent" | "system";
  senderId: string;
  senderName: string;
  content: string;
}) {
  await fetch("/api/trpc/project.sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
}

export const useWarRoomStore = create<WarRoomState>((set, get) => ({
  activeProjectId: null,
  messages: [],
  projectContext: "",
  keyDecisions: [],
  isLoadingMessages: false,

  setActiveProject: (id) => {
    set({ activeProjectId: id });
    if (id) {
      void get().fetchMessages(id);
    } else {
      set({ messages: [] });
    }
  },

  fetchMessages: async (projectId: string) => {
    set({ isLoadingMessages: true });
    try {
      const result = await fetchProjectMessages(projectId);
      const messages: WarRoomMessage[] = result.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        senderType: m.senderType,
        senderId: m.senderId,
        senderName: m.senderName,
        avatar: m.avatar ?? (m.senderType === "system" ? "🤖" : m.senderType === "agent" ? "🤖" : "👤"),
        content: m.content,
        createdAt: m.createdAt,
      }));

      if (messages.length === 0) {
        const welcomeMsg: WarRoomMessage = {
          id: `sys-${shortId()}`,
          projectId,
          senderId: "system",
          senderName: "系统",
          senderType: "system",
          avatar: "🤖",
          content: "欢迎进入作战室。当前项目上下文已加载。",
          createdAt: new Date().toISOString(),
        };
        set({ messages: [welcomeMsg], isLoadingMessages: false });
      } else {
        set({ messages, isLoadingMessages: false });
      }
    } catch (error) {
      console.error("获取消息失败:", error);
      set({ isLoadingMessages: false });
      const welcomeMsg: WarRoomMessage = {
        id: `sys-${shortId()}`,
        projectId,
        senderId: "system",
        senderName: "系统",
        senderType: "system",
        avatar: "🤖",
        content: "欢迎进入作战室。当前项目上下文已加载。",
        createdAt: new Date().toISOString(),
      };
      set({ messages: [welcomeMsg] });
    }
  },

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  clearMessages: () => set({ messages: [] }),

  setProjectContext: (context) => set({ projectContext: context }),

  addDecision: (decision) =>
    set((state) => ({
      keyDecisions: [
        {
          id: `dec-${shortId()}`,
          content: decision.content,
          author: decision.author,
          createdAt: new Date().toISOString(),
        },
        ...state.keyDecisions,
      ],
    })),

  sendMessage: async (content, senderInfo) => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;

    const tempMsg: WarRoomMessage = {
      id: `temp-${shortId()}`,
      projectId: activeProjectId,
      senderType: senderInfo.senderType,
      senderId: senderInfo.senderId,
      senderName: senderInfo.senderName,
      avatar: senderInfo.senderType === "agent" ? "🤖" : senderInfo.senderName.slice(0, 1),
      content,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, tempMsg] }));

    try {
      await postProjectMessage({
        projectId: activeProjectId,
        senderType: senderInfo.senderType,
        senderId: senderInfo.senderId,
        senderName: senderInfo.senderName,
        content,
      });
    } catch (error) {
      console.error("发送消息失败:", error);
    }
  },
}));
