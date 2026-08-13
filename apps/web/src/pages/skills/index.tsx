import { useEffect, useState } from "react";
import Head from "next/head";
import { X, Bot, UserCheck, Check } from "lucide-react";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";
import { api } from "~/utils/api";
import { SKILL_LIBRARY } from "~/lib/data/skills";
import toast from "~/utils/toast";

const riskColors: Record<string, string> = { "低": "bg-green-100 text-green-700", "中": "bg-orange-100 text-orange-700", "高": "bg-red-100 text-red-700" };
const catIcons: Record<string, string> = { "分析": "📊", "创作": "✍️", "沟通": "💬", "数据处理": "📋", "HR": "👥", "运营": "📱", "开发": "💻" };

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ← 上一页
      </button>
      <span className="px-2 tabular-nums">
        第 {currentPage} / {totalPages} 页
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        下一页 →
      </button>
    </div>
  );
}

export default function SkillsPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  const { data: agents } = api.agent.list.useQuery();
  const utils = api.useUtils();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [dialogAgentPage, setDialogAgentPage] = useState(1);
  const [dialogAgentPageSize, setDialogAgentPageSize] = useState(12);
  const [dialogSelectedAgents, setDialogSelectedAgents] = useState<Set<string>>(new Set());

  const categories = [...new Set(SKILL_LIBRARY.map((s) => s.category))];
  const filtered = filterCat ? SKILL_LIBRARY.filter((s) => s.category === filterCat) : SKILL_LIBRARY;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSkills = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleFilterCat = (cat: string) => { setFilterCat(cat === filterCat ? "" : cat); setCurrentPage(1); };
  const handlePageSize = (size: number) => { setPageSize(size); setCurrentPage(1); };

  const handleOpenDialog = (skillName: string) => { setSelectedSkill(skillName); setDialogAgentPage(1); setDialogSelectedAgents(new Set()); };

  useEffect(() => { setBreadcrumbs([{ label: "技能广场" }]); }, [setBreadcrumbs]);

  const updateAgent = api.agent.update.useMutation({
    onSuccess: async () => { await utils.agent.list.invalidate(); },
  });

  const installableAgents = (agents ?? []).filter((a) => a.isActive);

  const handleInstall = (skill: string, agentId: string) => {
    const agent = agents?.find((a) => a.id === agentId);
    if (!agent) return;
    if (agent.skillTags.includes(skill)) { toast("已安装"); return; }
    updateAgent.mutate({ id: agentId, skillTags: [...agent.skillTags, skill] }, {
      onSuccess: () => { toast(`「${skill}」已安装到 ${agent.name}`); },
      onError: () => toast("安装失败"),
    });
  };

  const handleBatchInstall = (skillName: string) => {
    if (dialogSelectedAgents.size === 0) return;
    let count = 0;
    for (const agentId of dialogSelectedAgents) {
      const agent = agents?.find((a) => a.id === agentId);
      if (!agent || agent.skillTags.includes(skillName)) continue;
      updateAgent.mutate({ id: agentId, skillTags: [...agent.skillTags, skillName] });
      count++;
    }
    if (count > 0) {
      toast(`「${skillName}」已安装到 ${count} 个 Agent`);
    }
    setSelectedSkill(null);
  };

  const toggleDialogAgent = (agentId: string) => {
    setDialogSelectedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId); else next.add(agentId);
      return next;
    });
  };

  return (
    <>
      <Head><title>数智企业 · 技能广场</title></Head>
      <AppShell>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">技能广场</h1>
            <p className="mt-1 text-sm text-gray-500">浏览可安装的技能模块 · 共 {SKILL_LIBRARY.length} 个技能</p>
          </div>

          {/* Category filter */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button onClick={() => handleFilterCat("")} className={`rounded-full px-3 py-1 text-xs font-medium ${!filterCat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>全部</button>
            {categories.map((c) => (
              <button key={c} onClick={() => handleFilterCat(c)} className={`rounded-full px-3 py-1 text-xs font-medium ${filterCat === c ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {catIcons[c] ?? ""} {c}
              </button>
            ))}
          </div>

          {/* Toolbar: page size + pagination */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>每页显示</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSize(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:border-blue-400 focus:outline-none"
              >
                {[8, 12, 16, 24].map((n) => (
                  <option key={n} value={n}>{n} 个</option>
                ))}
              </select>
              <span>· 共 {filtered.length} 个技能</span>
            </div>
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedSkills.map((skill) => (
              <div
                key={skill.name}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{skill.icon}</span>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-800">{skill.name}</h3>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{skill.category}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${riskColors[skill.risk]}`}>{skill.risk}风险</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Always visible detail */}
                <div className="mt-3 space-y-1.5 rounded-lg bg-gray-50 p-3 text-xs">
                  <p className="text-gray-600 leading-relaxed">{skill.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-400">
                    <span>📥 {skill.requires.join("、")}</span>
                    <span>📤 {skill.outputs.join("、")}</span>
                  </div>
                  <div className="text-gray-400 text-[11px] italic">
                    💡 {skill.useCase}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenDialog(skill.name)}
                  className="mt-2 w-full rounded-lg border border-blue-200 py-1.5 text-xs text-blue-600 transition-colors hover:bg-blue-50"
                >
                  安装
                </button>
              </div>
            ))}
          </div>

          {/* Bottom paginator */}
          {filtered.length > pageSize && (
            <div className="mt-6 flex justify-center">
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}

          {/* Install dialog */}
          {selectedSkill && (() => {
            const skill = SKILL_LIBRARY.find((s) => s.name === selectedSkill);
            if (!skill) return null;

            const dialogTotalPages = Math.max(1, Math.ceil(installableAgents.length / dialogAgentPageSize));
            const dialogSafePage = Math.min(dialogAgentPage, dialogTotalPages);
            const paginatedAgents = installableAgents.slice(
              (dialogSafePage - 1) * dialogAgentPageSize,
              dialogSafePage * dialogAgentPageSize
            );
            const handleDialogPageSize = (size: number) => { setDialogAgentPageSize(size); setDialogAgentPage(1); };

            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setSelectedSkill(null)}>
                <div className="absolute inset-0 bg-black/40" />
                <div
                  className="relative z-10 w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{skill.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">{skill.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{skill.category}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${riskColors[skill.risk]}`}>{skill.risk}风险</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedSkill(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Skill detail */}
                  <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-xs mb-4">
                    <p className="text-gray-600 leading-relaxed">{skill.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-400">
                      <span>📥 {skill.requires.join("、")}</span>
                      <span>📤 {skill.outputs.join("、")}</span>
                    </div>
                    <div className="text-gray-400 text-[11px] italic">💡 {skill.useCase}</div>
                  </div>

                  {/* Agent list header with page size */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <span>每页</span>
                      <select
                        value={dialogAgentPageSize}
                        onChange={(e) => handleDialogPageSize(Number(e.target.value))}
                        className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] text-gray-600 focus:border-blue-400 focus:outline-none"
                      >
                        {[12, 24, 36].map((n) => (
                          <option key={n} value={n}>{n} 个</option>
                        ))}
                      </select>
                      <span>· 共 {installableAgents.length} 个</span>
                    </div>
                    {installableAgents.length > dialogAgentPageSize && (
                      <Pagination
                        currentPage={dialogSafePage}
                        totalPages={dialogTotalPages}
                        onPageChange={setDialogAgentPage}
                      />
                    )}
                  </div>

                  <p className="text-xs font-medium text-gray-700 mb-2">
                    选择安装目标：
                    {dialogSelectedAgents.size > 0 && (
                      <span className="ml-1 text-blue-600">已选 {dialogSelectedAgents.size} 个</span>
                    )}
                  </p>
                  {installableAgents.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">暂无可用 Agent</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {paginatedAgents.map((agent) => {
                        const TypeIcon = agent.type === "DIGITAL_TWIN" ? UserCheck : Bot;
                        const has = agent.skillTags.includes(skill.name);
                        const selected = dialogSelectedAgents.has(agent.id);
                        return (
                          <button
                            key={agent.id}
                            onClick={() => { if (!has) toggleDialogAgent(agent.id); }}
                            disabled={has}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                              has ? "bg-green-50 text-green-600 cursor-default" :
                              selected ? "bg-blue-50 border border-blue-300 text-blue-700" :
                              "bg-white border border-gray-100 text-gray-700 hover:bg-gray-50 hover:border-gray-200"
                            }`}
                          >
                            <TypeIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1 font-medium truncate">{agent.name}</span>
                            <span className="flex-shrink-0 text-[10px] text-gray-400">{agent.type === "DIGITAL_TWIN" ? "分身" : "Agent"}</span>
                            {has ? (
                              <span className="text-green-600 text-xs">✓ 已安装</span>
                            ) : selected ? (
                              <Check className="h-4 w-4 flex-shrink-0 text-blue-600" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-5 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedSkill(null)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleBatchInstall(skill.name)}
                      disabled={dialogSelectedAgents.size === 0 || updateAgent.isPending}
                      className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {updateAgent.isPending ? "安装中..." : `确认安装 (${dialogSelectedAgents.size})`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </AppShell>
    </>
  );
}
