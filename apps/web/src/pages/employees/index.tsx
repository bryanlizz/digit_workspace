import { useEffect, useState } from "react";
import Head from "next/head";
import { Search, UserPlus } from "lucide-react";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";
import { PRESET_EMPLOYEES } from "~/lib/data/preset-employees";
import { SKILL_LIBRARY } from "~/lib/data/skills";
import { api } from "~/utils/api";
import toast from "~/utils/toast";

const SURNAMES = "赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜".split("");
const GIVEN = "欣怡雨桐梓涵一诺思颖俊杰浩然宇轩子墨博文雅琪晓萌若溪".split("");

function seededName(empId: string): string {
  let hash = 0;
  for (let i = 0; i < empId.length; i++) hash = ((hash << 5) - hash) + empId.charCodeAt(i) | 0;
  const abs = Math.abs(hash);
  const s = SURNAMES[abs % SURNAMES.length]!;
  const g1 = GIVEN[abs % GIVEN.length]!;
  const g2 = GIVEN[(abs * 7) % GIVEN.length]!;
  return s + g1 + g2;
}

export default function EmployeesPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  const utils = api.useUtils();
  const [search, setSearch] = useState("");
  const [defaultNames] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    PRESET_EMPLOYEES.forEach((e) => { map[e.id] = `${e.title} ${seededName(e.id)}`; });
    return map;
  });

  const getName = (empId: string) => defaultNames[empId] ?? "未命名";

  const createAgent = api.agent.create.useMutation({
    onSuccess: async (_data, vars) => {
      await utils.agent.list.invalidate();
      toast(`「${vars.name}」已招募`);
    },
    onError: () => toast("招募失败，请稍后再试"),
  });

  useEffect(() => { setBreadcrumbs([{ label: "员工广场" }]); }, [setBreadcrumbs]);

  const filtered = PRESET_EMPLOYEES.filter(
    (e) => e.name.includes(search) || e.department.includes(search)
  );

  const riskColors: Record<string, string> = { LOW: "bg-green-100 text-green-700", MEDIUM: "bg-orange-100 text-orange-700", HIGH: "bg-red-100 text-red-700" };
  const riskLabels: Record<string, string> = { LOW: "低", MEDIUM: "中", HIGH: "高" };

  return (
    <>
      <Head><title>数智企业 · 员工广场</title></Head>
      <AppShell>
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">员工广场</h1>
              <p className="mt-1 text-sm text-gray-500">浏览可招募的数字员工 · 共 {PRESET_EMPLOYEES.length} 个预设角色</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索员工..." className="w-64 rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((emp) => {
              return (
                <div key={emp.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white" style={{ backgroundColor: emp.color }}>
                        {emp.name[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{emp.name}</h3>
                        <p className="text-xs text-gray-500">{emp.title}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${riskColors[emp.riskLevel]}`}>
                      {riskLabels[emp.riskLevel]}风险
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">{emp.department}</div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {emp.skills.slice(0, 3).map((s) => (<span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{s}</span>))}
                    {emp.skills.length > 3 && <span className="text-[11px] text-gray-400">+{emp.skills.length - 3}</span>}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
                    <div><p className="text-sm font-bold text-gray-800">¥199</p><p className="text-[10px] text-gray-400">/ 席位 · 月</p></div>
                    <div className="flex text-xs text-yellow-500">{"★".repeat(4)}{"☆".repeat(1)}</div>
                  </div>

                  <button
                    onClick={() => createAgent.mutate({
                      name: getName(emp.id),
                        type: "DIGITAL_TWIN",
                        ownerId: "admin-boss",
                        presetRoleId: emp.id,
                        skillTags: (() => {
                          const pool = SKILL_LIBRARY.filter((s) => {
                            if (emp.department.includes("战略") || emp.department.includes("研究")) return s.category === "分析";
                            if (emp.department.includes("产品") || emp.department.includes("开发")) return s.category === "创作" || s.category === "开发";
                            if (emp.department.includes("销售") || emp.department.includes("市场")) return s.category === "沟通" || s.category === "运营";
                            if (emp.department.includes("财务") || emp.department.includes("法务")) return s.category === "数据处理" || s.category === "分析";
                            if (emp.department.includes("人才") || emp.department.includes("组织")) return s.category === "HR";
                            return true;
                          });
                          if (pool.length === 0) return SKILL_LIBRARY.slice(0, 3).map((s) => s.name);
                          return pool.slice(0, 3).map((s) => s.name);
                        })(),
                        permissionBm: emp.defaultPermission,
                        roleTitle: emp.title,
                        rolePersonality: `${emp.department} 方向专家`,
                        roleBoundaries: `权限等级 L${Math.min(3, emp.defaultPermission)}`,
                      })}
                    disabled={createAgent.isPending}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <UserPlus className="h-4 w-4" /> {createAgent.isPending ? "招募中..." : "招募"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </AppShell>
    </>
  );
}
