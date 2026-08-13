import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { Star, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";
import { api } from "~/utils/api";

/** SVG 雷达图 */
function RadarChart({ scores, prevScores, labels }: { scores: number[]; prevScores: number[]; labels: string[] }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  const angles = labels.map((_, i) => (Math.PI * 2 * i) / labels.length - Math.PI / 2);

  const toPoint = (v: number, a: number) => ({
    x: cx + r * (v / 100) * Math.cos(a),
    y: cy + r * (v / 100) * Math.sin(a),
  });

  const grid = [20, 40, 60, 80, 100];
  const prevPoints = prevScores.map((v, i) => toPoint(v, angles[i]!));
  const curPoints = scores.map((v, i) => toPoint(v, angles[i]!));

  return (
    <svg width={size} height={size}>
      {grid.map((pct) => (
        <polygon key={pct} points={labels.map((_, i) => {
          const p = toPoint(pct, angles[i]!);
          return `${p.x},${p.y}`;
        }).join(" ")} fill="none" stroke="#e5e7eb" strokeWidth="1" />
      ))}
      <polygon points={prevPoints.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="rgba(156,163,175,0.15)" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="4,2" />
      <polygon points={curPoints.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" />
      {labels.map((label, i) => {
        const p = toPoint(105, angles[i]!);
        return <text key={label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
          fontSize="9" fill="#6b7280">{label}</text>;
      })}
    </svg>
  );
}

export default function EvolutionPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [memoryAgent, setMemoryAgent] = useState("all");
  const [memoryPage, setMemoryPage] = useState(0);
  const [badCaseFilter, setBadCaseFilter] = useState<"all" | "fixed" | "unfixed">("all");
  const [memoryType, setMemoryType] = useState<"" | "success" | "failure" | "preference" | "insight">("");

  const { data: agents } = api.agent.list.useQuery();
  const { data: allTasks } = api.task.list.useQuery();
  const memoryQueryAgentId = memoryAgent === "all" ? agents?.[0]?.id ?? "" : memoryAgent;
  const { data: memories, isLoading: isLoadingMemories } = api.memory.list.useQuery(
    { agentId: memoryQueryAgentId, limit: 10, offset: memoryPage * 10, type: memoryType || undefined },
    { enabled: !!memoryQueryAgentId },
  );

  // 从驳回任务生成 Bad Case 列表
  const rejectedTasks = allTasks?.filter((t) => t.status === "REJECTED") ?? [];
  const badCases = rejectedTasks.map((task) => ({
    id: task.id,
    task: task.title,
    reason: task.approvalComment || task.result || task.description || "未知原因",
    agent: task.assignee?.name ?? "未知",
    agentId: task.assignee?.id,
    date: task.completedAt ? new Date(task.completedAt).toLocaleDateString("zh-CN") : "-",
    fixed: task.approved === true,
  }));

  useEffect(() => {
    setBreadcrumbs([{ label: "进化", path: "/evolution" }, { label: "Hermes" }]);
  }, [setBreadcrumbs]);

  const totalTasks = allTasks?.length ?? 0;
  const doneTasks = allTasks?.filter((t) => t.status === "DONE").length ?? 0;
  const adoptionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const filteredBadCases = badCases.filter((bc) => {
    if (badCaseFilter === "fixed") return bc.fixed;
    if (badCaseFilter === "unfixed") return !bc.fixed;
    return true;
  });

  const radarLabels = ["分析能力", "执行效率", "质量评分", "学习速度", "协作能力", "创新性"];
  const currentScores = [85, 72, 78, 65, 70, 60];
  const prevScores = [70, 60, 65, 50, 55, 45];

  const showMemoryEmpty = !isLoadingMemories && (!memories || memories.data.length === 0);

  return (
    <>
      <Head><title>数智企业 · 进化</title></Head>
      <AppShell>
        <div className="p-6">
          <h1 className="mb-6 text-2xl font-bold text-gray-800">🧬 进化 · Hermes</h1>

          {/* 统计卡片 */}
          <div className="mb-8 grid grid-cols-5 gap-4">
            {[
              { label: "系统已记录任务", value: totalTasks, color: "text-blue-600" },
              { label: "总体采纳率", value: `${adoptionRate}%`, color: "text-green-600" },
              { label: "Bad Case", value: rejectedTasks.length, color: "text-red-500" },
              { label: "进化代数", value: "3", color: "text-purple-600" },
              { label: "记忆片段", value: memories?.total ?? 0, color: "text-orange-600" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* 成长曲线 */}
            <div className="col-span-2 rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-gray-800">成长曲线</h2>
                <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm">
                  <option value="all">全部 Agent</option>
                  {agents?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="h-48">
                <svg viewBox="0 0 600 160" className="h-full w-full">
                  {[0, 1, 2, 3].map((i) => (
                    <line key={i} x1="0" y1={40 + i * 35} x2="580" y2={40 + i * 35} stroke="#f0f0f0" strokeWidth="1" />
                  ))}
                  {/* 柱状图 */}
                  {[
                    [20, 100], [80, 85], [140, 110], [200, 70], [260, 95],
                    [320, 120], [380, 90], [440, 105], [500, 80], [560, 115],
                  ].map((point) => {
                    const x = point[0]!;
                    const h = point[1]!;
                    return (
                      <rect key={`bar-${x}`} x={x - 8} y={145 - h} width={16} height={h}
                        fill="rgba(59,130,246,0.3)" rx="2" />
                    );
                  })}
                  {/* 成功率折线 */}
                  <polyline points="0,130 60,110 120,95 180,80 240,75 300,65 360,55 420,50 480,40 540,35"
                    fill="none" stroke="#10b981" strokeWidth="2" />
                  {[
                    [0, 130], [60, 110], [120, 95], [180, 80], [240, 75],
                    [300, 65], [360, 55], [420, 50], [480, 40], [540, 35],
                  ].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="3" fill="#10b981" />
                  ))}
                  <text x="260" y="20" fontSize="9" fill="#9ca3af">📊 柱状=任务数 · 折线=成功率(trend) </text>
                  {/* 图例 */}
                  <rect x="260" y="8" width="8" height="8" fill="rgba(59,130,246,0.3)" rx="1" />
                  <text x="272" y="16" fontSize="8" fill="#6b7280">任务</text>
                  <circle cx="310" cy="12" r="4" fill="#10b981" />
                  <text x="318" y="16" fontSize="8" fill="#6b7280">成功率</text>
                </svg>
              </div>
            </div>

            {/* 雷达图 */}
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-2 font-bold text-gray-800">技能成长</h2>
              <div className="flex justify-center">
                <RadarChart scores={currentScores} prevScores={prevScores} labels={radarLabels} />
              </div>
              <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-4 rounded bg-blue-500" /> 现在
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-gray-400" /> 30天前
                </span>
              </div>
            </div>
          </div>

          {/* Bad Case + 记忆浏览器 */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Bad Case */}
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-gray-800">⚠️ Bad Case</h2>
                <div className="flex gap-1">
                  {(["all", "fixed", "unfixed"] as const).map((f) => (
                    <button key={f} onClick={() => setBadCaseFilter(f)}
                      className={`rounded px-2 py-1 text-xs ${
                        badCaseFilter === f ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}>
                      {f === "all" ? "全部" : f === "fixed" ? "已修复" : "待修复"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {filteredBadCases.length > 0 ? filteredBadCases.map((bc) => (
                  <div key={bc.id} className={`rounded-lg border p-3 ${
                    bc.fixed ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"
                  }`}>
                    <div className="flex items-start gap-2">
                      {bc.fixed ? (
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{bc.task}</p>
                        <p className="text-xs text-gray-500">{bc.reason}</p>
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-400">
                          <span>🤖 {bc.agent}</span>
                          <span>📅 {bc.date}</span>
                          <span className={bc.fixed ? "text-green-600" : "text-orange-600"}>
                            {bc.fixed ? "已修复" : "待修复"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="py-8 text-center text-xs text-gray-400">暂无 Bad Case</p>
                )}
              </div>
            </div>

            {/* 记忆浏览器 */}
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-gray-800">🧠 记忆浏览器</h2>
                <div className="flex items-center gap-2">
                  <select value={memoryAgent} onChange={(e) => setMemoryAgent(e.target.value)}
                    className="rounded border border-gray-200 px-2 py-1 text-xs">
                    <option value="all">全部 Agent</option>
                    {agents?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <select value={memoryType} onChange={(e) => setMemoryType(e.target.value as "" | "success" | "failure" | "preference" | "insight")}
                    className="rounded border border-gray-200 px-2 py-1 text-xs">
                    <option value="">全部</option>
                    <option value="success">成功</option>
                    <option value="failure">失败</option>
                    <option value="insight">洞察</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {isLoadingMemories ? (
                  <div className="flex items-center justify-center py-10 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : memories?.data.map((mem) => (
                  <div key={mem.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        mem.type === "success" ? "bg-green-100 text-green-600" :
                        mem.type === "failure" ? "bg-red-100 text-red-600" :
                        mem.type === "insight" ? "bg-blue-100 text-blue-600" :
                        "bg-purple-100 text-purple-600"
                      }`}>
                        {mem.type === "success" ? "成功" : mem.type === "failure" ? "失败" : mem.type === "insight" ? "洞察" : "偏好"}
                      </span>
                      <span className="flex">
                        {Array.from({ length: mem.importance }, (_, j) => (
                          <Star key={j} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">{mem.summary}</p>
                    <p className="mt-0.5 text-[10px] text-gray-400">{new Date(mem.createdAt).toLocaleDateString("zh-CN")}</p>
                  </div>
                ))}
                {showMemoryEmpty && (
                  <p className="py-8 text-center text-xs text-gray-400">暂无记忆数据</p>
                )}
              </div>

                {memories && memories.total > 10 && (
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <button onClick={() => setMemoryPage(Math.max(0, memoryPage - 1))}
                      disabled={memoryPage === 0}
                      className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-30">上一页</button>
                    <span>{memoryPage + 1} / {Math.ceil(memories.total / 10)}</span>
                    <button onClick={() => setMemoryPage(memoryPage + 1)}
                      disabled={(memoryPage + 1) * 10 >= memories.total}
                      className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-30">下一页</button>
                  </div>
                )}
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
