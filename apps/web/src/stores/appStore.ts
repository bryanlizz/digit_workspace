import { create } from "zustand";

export interface DetailPanelState {
  type: "employee" | "task" | "agent" | null;
  data: Record<string, unknown> | null;
}

interface AppState {
  // 当前选中的侧边栏
  activeNav: string;
  setActiveNav: (nav: string) => void;

  // 面包屑路径
  breadcrumbs: Array<{ label: string; path?: string }>;
  setBreadcrumbs: (crumbs: Array<{ label: string; path?: string }>) => void;

  // 右侧详情面板
  showDetailPanel: boolean;
  detailPanel: DetailPanelState;
  openDetailPanel: (type: DetailPanelState["type"], data: Record<string, unknown>) => void;
  closeDetailPanel: () => void;

  // 路演模式
  tourMode: boolean;
  setTourMode: (on: boolean) => void;
  tourCamera: { x: number; y: number; z: number } | null;
  setTourCamera: (pos: { x: number; y: number; z: number } | null) => void;

  // 待处理数量
  pendingApprovalCount: number;
  setPendingApprovalCount: (count: number) => void;
  highRiskCount: number;
  setHighRiskCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeNav: "/",
  setActiveNav: (nav) => set({ activeNav: nav }),

  breadcrumbs: [{ label: "总部" }],
  setBreadcrumbs: (crumbs) => set({ breadcrumbs: crumbs }),

  showDetailPanel: false,
  detailPanel: { type: null, data: null },
  openDetailPanel: (type, data) =>
    set({ showDetailPanel: true, detailPanel: { type, data } }),
  closeDetailPanel: () =>
    set({ showDetailPanel: false, detailPanel: { type: null, data: null } }),

  tourMode: false,
  setTourMode: (on) => set({ tourMode: on }),
  tourCamera: null,
  setTourCamera: (pos) => set({ tourCamera: pos }),

  pendingApprovalCount: 0,
  setPendingApprovalCount: (count) => set({ pendingApprovalCount: count }),
  highRiskCount: 0,
  setHighRiskCount: (count) => set({ highRiskCount: count }),
}));
