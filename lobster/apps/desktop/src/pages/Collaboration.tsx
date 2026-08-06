import { useEffect, useState, useCallback } from "react";
import { Users } from "lucide-react";
import { trpc } from "../trpc";
import { WarRoomChat } from "../components/WarRoomChat";
import { useWarRoomStore } from "../stores/warRoomStore";

type ProjectSummary = Awaited<ReturnType<typeof trpc.project.list.query>>[number];

export function CollaborationPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeProjectId = useWarRoomStore((s) => s.activeProjectId);
  const setActiveProject = useWarRoomStore((s) => s.setActiveProject);
  const isLoadingMessages = useWarRoomStore((s) => s.isLoadingMessages);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoadingProjects(true);
        const list = await trpc.project.list.query();
        if (!mounted) return;
        setProjects(list);
        setError(null);

        // 自动选中第一个项目
        if (list.length > 0 && !activeProjectId) {
          setActiveProject(list[0]!.id);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "项目列表加载失败");
      } finally {
        if (mounted) setLoadingProjects(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleProjectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setActiveProject(e.target.value);
    },
    [setActiveProject],
  );

  return (
    <div className="flex h-full flex-col p-8">
      {/* 页头 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-rose-600" />
          <h1 className="text-xl font-bold text-gray-800">协作空间</h1>
        </div>

        {/* 项目选择器 */}
        {!loadingProjects && !error && projects.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">项目：</label>
            <select
              value={activeProjectId ?? ""}
              onChange={handleProjectChange}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-rose-300"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 状态处理 */}
      {loadingProjects && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white">
          <p className="text-sm text-gray-400">加载项目中...</p>
        </div>
      )}

      {error && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-red-100 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!loadingProjects && !error && projects.length === 0 && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white">
          <div className="text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">暂无协作项目</p>
            <p className="mt-1 text-xs text-gray-400">请先在管理后台创建项目</p>
          </div>
        </div>
      )}

      {!loadingProjects && !error && projects.length > 0 && (
        <div className="flex-1 min-h-0">
          <WarRoomChat />
        </div>
      )}
    </div>
  );
}
