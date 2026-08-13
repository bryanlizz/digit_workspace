import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import { Plus, Send, X, Loader2, RotateCcw, Ban } from "lucide-react";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";
import { useWarRoomStore, type WarRoomMessage } from "~/stores/warRoomStore";
import { api } from "~/utils/api";

/** 相对时间 */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "昨天";
  if (days < 7) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function parseTaskResult(result?: string | null): { summary?: string; retryHistory?: unknown[]; retrySubTaskIds?: string[] } | null {
  if (!result) return null;

  try {
    const parsed = JSON.parse(result) as {
      summary?: string;
      retryHistory?: unknown[];
      retrySubTaskIds?: string[];
    };

    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export default function CollaborationPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  const {
    activeProjectId, setActiveProject,
    messages, addMessage, projectContext, setProjectContext,
    keyDecisions, addDecision, isLoadingMessages, sendMessage,
  } = useWarRoomStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "archived">("all");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const utils = api.useUtils();

  const { data: projects } = api.project.list.useQuery({ status: filterTab === "archived" ? "ARCHIVED" : undefined });
  const { data: projectDetail } = api.project.getById.useQuery({ id: activeProjectId! }, { enabled: !!activeProjectId });
  const { data: tasks } = api.task.list.useQuery({ projectId: activeProjectId! }, { enabled: !!activeProjectId });
  const { data: agents } = api.agent.list.useQuery();
  const { data: presets } = api.employee.getPresets.useQuery();

  const taskListUtils = utils.task.list;
  const projectListUtils = utils.project.list;

  const refreshTasks = async () => {
    await Promise.all([
      taskListUtils.invalidate(),
      projectListUtils.invalidate(),
    ]);
  };

  const createProject = api.project.create.useMutation({
    onSuccess: async (project) => {
      setShowCreateModal(false);
      await refreshTasks();
      setActiveProject(project.id);
    },
  });
  const createTask = api.task.create.useMutation({
    onSuccess: async () => {
      setShowTaskModal(false);
      await refreshTasks();
    },
  });
  const cancelTask = api.task.cancel.useMutation({ onSuccess: refreshTasks });
  const retryTask = api.task.retry.useMutation({ onSuccess: refreshTasks });

  useEffect(() => {
    setBreadcrumbs([{ label: "协作", path: "/collaboration" }, { label: "作战室" }]);
  }, [setBreadcrumbs]);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!chatInput.trim() || !activeProjectId) return;

    const currentInput = chatInput.trim();
    setChatInput("");

    // 发送消息到 API
    await sendMessage(currentInput, {
      senderId: "admin-boss",
      senderName: "王老板",
      senderType: "human",
    });

    // TODO: Agent 回复逻辑将在后续阶段实现
    // 目前仅记录人类消息
  };

  const filteredProjects = projects?.filter((p) => {
    if (filterTab === "active") return p.status === "ACTIVE";
    if (filterTab === "archived") return p.status === "ARCHIVED";
    return true;
  });

  return (
    <>
      <Head><title>数智企业 · 协作</title></Head>
      <AppShell>
        <div className="flex h-[calc(100vh-4rem)]">
          {/* 左侧项目列表 */}
          <div className="flex w-[280px] flex-col border-r border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-800">项目</h2>
              <button onClick={() => setShowCreateModal(true)} className="rounded-lg bg-blue-600 p-1.5 text-white">
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* 筛选 Tab */}
            <div className="flex gap-1 border-b border-gray-100 px-3 py-2">
              {(["all", "active", "archived"] as const).map((tab) => (
                <button key={tab} onClick={() => setFilterTab(tab)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    filterTab === tab ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
                  }`}
                >{tab === "all" ? "全部" : tab === "active" ? "活跃" : "已归档"}</button>
              ))}
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {filteredProjects?.map((p) => (
                <div key={p.id} onClick={() => setActiveProject(p.id)}
                  className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    activeProjectId === p.id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-[10px] text-gray-400">{p.taskCount} 任务</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-400">{p.description}</p>
                </div>
              ))}
              {(!filteredProjects || filteredProjects.length === 0) && (
                <p className="py-8 text-center text-xs text-gray-400">暂无项目</p>
              )}
            </div>
          </div>

          {/* 中间：聊天区域 */}
          <div className="flex flex-1 flex-col bg-white">
            {activeProjectId ? (
              <>
                {/* 聊天 Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                  <h3 className="text-sm font-bold text-gray-800">
                    {projectDetail?.name ?? "作战室"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowTaskModal(true)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white">+ 任务</button>
                  </div>
                </div>

                {/* 消息列表 */}
                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  {isLoadingMessages ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm text-gray-400">暂无消息</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`flex gap-3 ${msg.senderType === "system" ? "justify-center" : ""}`}>
                        {msg.senderType === "system" ? (
                          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-1.5 text-xs text-gray-500">
                            {msg.content}
                          </div>
                        ) : (
                          <>
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                              msg.senderType === "agent" ? "bg-purple-500" : "bg-blue-600"
                            }`}>
                              {msg.avatar}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-800">{msg.senderName}</span>
                                <span className="text-[10px] text-gray-400">{timeAgo(msg.createdAt)}</span>
                                {msg.senderType === "agent" && (
                                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-600">AI</span>
                                )}
                              </div>
                              <p className={`mt-1 rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                                msg.senderType === "agent" ? "bg-purple-50 text-gray-700" : "bg-gray-50 text-gray-800"
                              }`}>
                                {msg.content}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* 输入框 */}
                <div className="border-t border-gray-100 p-4">
                  <div className="flex gap-3">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="输入消息... Enter 发送"
                      className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
                    />
                    <button onClick={handleSend}
                      className="rounded-lg bg-blue-600 p-2.5 text-white transition-colors hover:bg-blue-700">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">Enter 发送 · Shift+Enter 换行</p>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl">💬</span>
                  <p className="mt-3 text-sm text-gray-400">选择一个项目开始协作</p>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：共享上下文面板 */}
          <div className="w-[280px] border-l border-gray-200 bg-gray-50 p-4">
            {activeProjectId ? (
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">项目目标</h4>
                  <textarea
                    value={projectContext}
                    onChange={(e) => setProjectContext(e.target.value)}
                    placeholder="描述项目目标..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs"
                  />
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    关键决策 ({keyDecisions.length})
                  </h4>
                  <div className="space-y-2">
                    {keyDecisions.map((d) => (
                      <div key={d.id} className="rounded-lg border border-yellow-200 bg-yellow-50 p-2">
                        <p className="text-xs text-gray-700">{d.content}</p>
                        <p className="mt-1 text-[10px] text-gray-400">{d.author} · {new Date(d.createdAt).toLocaleDateString("zh-CN")}</p>
                      </div>
                    ))}
                    <button onClick={() => {
                      const content = prompt("记录决策：");
                      if (content) addDecision({ content, author: "王老板" });
                    }} className="w-full rounded-lg border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:border-gray-400">
                      + 记录决策
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    参与成员
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">王</span>
                      王老板 <span className="ml-auto text-gray-400">人类</span>
                    </div>
                    {agents?.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-[10px] text-white">🤖</span>
                        {a.name} <span className="ml-auto text-gray-400">Agent</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 任务概览 */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    任务概览
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {["PENDING", "IN_PROGRESS", "AWAITING_APPROVAL", "DONE", "REJECTED"].map((s) => (
                      <div key={s} className="rounded-lg bg-white p-2 text-center text-xs">
                        <p className="text-lg font-bold text-gray-700">
                          {tasks?.filter((t) => t.status === s).length ?? 0}
                        </p>
                        <p className="text-gray-400">{s === "PENDING" ? "待分配" : s === "IN_PROGRESS" ? "执行中" : s === "AWAITING_APPROVAL" ? "待审批" : s === "REJECTED" ? "失败" : "已完成"}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    {tasks?.slice(0, 5).map((task) => {
                      const taskResult = parseTaskResult((task as { result?: string | null }).result);
                      const retryCount = taskResult?.retryHistory?.length ?? 0;
                      const lastSummary = taskResult?.summary;
                      const canCancel = ["IN_PROGRESS", "AWAITING_APPROVAL", "BLOCKED"].includes(task.status);
                      const canRetry = task.status === "REJECTED";
                      return (
                        <div key={task.id} className="rounded-lg bg-white p-2 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-700">{task.title}</p>
                              <p className="mt-0.5 text-[10px] text-gray-400">{task.status}</p>
                              {(retryCount > 0 || lastSummary) && (
                                <p className="mt-1 line-clamp-2 text-[10px] text-gray-500">
                                  {retryCount > 0 ? `重试 ${retryCount} 次` : "首次执行"}
                                  {lastSummary ? ` · 最近结果：${lastSummary}` : ""}
                                </p>
                              )}
                            </div>
                            {canCancel && (
                              <button
                                type="button"
                                disabled={cancelTask.isPending}
                                onClick={() => cancelTask.mutate({ taskId: task.id })}
                                className="flex shrink-0 items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[10px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                <Ban className="h-3 w-3" /> 取消
                              </button>
                            )}
                            {canRetry && (
                              <button
                                type="button"
                                disabled={retryTask.isPending}
                                onClick={() => retryTask.mutate({ taskId: task.id })}
                                className="flex shrink-0 items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                              >
                                <RotateCcw className="h-3 w-3" /> 重试
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {tasks && tasks.length > 5 && (
                      <p className="text-center text-[10px] text-gray-400">仅显示最近 5 个任务</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-gray-400">选择项目查看上下文</p>
              </div>
            )}
          </div>
        </div>
      </AppShell>

      {/* 新建项目 Modal */}
      {showCreateModal && (
        <Modal title="新建项目" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.target as HTMLFormElement);
            createProject.mutate({
              name: data.get("name") as string,
              description: data.get("description") as string,
              participantAgentIds: agents?.map((a) => a.id) ?? [],
            });
          }}>
            <input name="name" placeholder="项目名称" required className="w-full rounded-lg border border-gray-200 p-2.5 text-sm" />
            <textarea name="description" placeholder="项目描述" rows={3} className="mt-3 w-full rounded-lg border border-gray-200 p-2.5 text-sm" />
            <button type="submit" className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm text-white">创建项目</button>
          </form>
        </Modal>
      )}

      {/* 新建任务 Modal */}
      {showTaskModal && (
        <Modal title="添加任务" onClose={() => setShowTaskModal(false)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.target as HTMLFormElement);
            createTask.mutate({
              title: data.get("title") as string,
              description: data.get("description") as string,
              assigneeId: data.get("assigneeId") as string,
              projectId: activeProjectId!,
              riskLevel: (data.get("riskLevel") as "LOW" | "MEDIUM" | "HIGH") ?? "LOW",
            });
          }}>
            <input name="title" placeholder="任务标题" required className="w-full rounded-lg border border-gray-200 p-2.5 text-sm" />
            <textarea name="description" placeholder="任务描述" rows={3} className="mt-3 w-full rounded-lg border border-gray-200 p-2.5 text-sm" />
            <select name="riskLevel" className="mt-3 w-full rounded-lg border border-gray-200 p-2.5 text-sm">
              <option value="LOW">低风险</option>
              <option value="MEDIUM">中风险</option>
              <option value="HIGH">高风险</option>
            </select>
            <select name="assigneeId" className="mt-3 w-full rounded-lg border border-gray-200 p-2.5 text-sm">
              <option value="">选择执行 Agent</option>
              {agents?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button type="submit" className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm text-white">创建任务</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
