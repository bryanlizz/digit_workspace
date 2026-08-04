import { useEffect, useState } from "react";
import Head from "next/head";
import { X, Bot, UserCheck } from "lucide-react";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";
import { api } from "~/utils/api";
import { SKILL_LIBRARY } from "~/lib/data/skills";
import toast from "~/utils/toast";

const riskColors: Record<string, string> = { "低": "bg-green-100 text-green-700", "中": "bg-orange-100 text-orange-700", "高": "bg-red-100 text-red-700" };
const catIcons: Record<string, string> = { "分析": "📊", "创作": "✍️", "沟通": "💬", "数据处理": "📋", "HR": "👥", "运营": "📱", "开发": "💻" };

export default function SkillsPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  const { data: agents } = api.agent.list.useQuery();
  const utils = api.useUtils();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>("");

  const categories = [...new Set(SKILL_LIBRARY.map((s) => s.category))];
  const filtered = filterCat ? SKILL_LIBRARY.filter((s) => s.category === filterCat) : SKILL_LIBRARY;

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
      onSuccess: () => { toast(`「${skill}」已安装到 ${agent.name}`); setSelectedSkill(null); },
      onError: () => toast("安装失败"),
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
            <button onClick={() => setFilterCat("")} className={`rounded-full px-3 py-1 text-xs font-medium ${!filterCat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>全部</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setFilterCat(c === filterCat ? "" : c)} className={`rounded-full px-3 py-1 text-xs font-medium ${filterCat === c ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {catIcons[c] ?? ""} {c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((skill) => (
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

                <div className="mt-2 text-sm font-bold text-blue-600">¥{skill.price}<span className="text-xs font-normal text-gray-400">/月</span></div>

                {selectedSkill === skill.name ? (
                  <div className="mt-2 space-y-1.5 rounded-lg border border-blue-200 bg-blue-50 p-2">
                    <p className="text-[10px] font-medium text-blue-700">选择安装目标：</p>
                    {installableAgents.length === 0 ? (
                      <p className="text-[10px] text-gray-500">暂无可用 Agent</p>
                    ) : (
                      installableAgents.map((agent) => {
                        const TypeIcon = agent.type === "DIGITAL_TWIN" ? UserCheck : Bot;
                        const has = agent.skillTags.includes(skill.name);
                        const pending = updateAgent.isPending && updateAgent.variables?.id === agent.id;
                        return (
                          <button key={agent.id} onClick={() => handleInstall(skill.name, agent.id)} disabled={pending || has}
                            className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-[10px] ${has ? "bg-green-100 text-green-600" : pending ? "bg-gray-100 text-gray-400" : "bg-white text-gray-700 hover:bg-blue-100"}`}>
                            <TypeIcon className="h-3 w-3 flex-shrink-0" />
                            <span className="flex-1 truncate">{agent.name}</span>
                            <span className="flex-shrink-0 text-gray-400">{agent.type === "DIGITAL_TWIN" ? "分身" : "Agent"}</span>
                            {has && <span className="text-green-600">✓</span>}
                          </button>
                        );
                      })
                    )}
                    <button onClick={() => setSelectedSkill(null)} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700"><X className="h-2.5 w-2.5" />取消</button>
                  </div>
                ) : (
                  <button onClick={() => setSelectedSkill(skill.name)} className="mt-2 w-full rounded-lg border border-blue-200 py-1.5 text-xs text-blue-600 transition-colors hover:bg-blue-50">安装</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    </>
  );
}
