import { useEffect, useState } from "react";
import Head from "next/head";
import { Search, Send, Upload } from "lucide-react";
import { AppShell } from "~/components/layout/AppShell";
import { KnowledgeGraph } from "~/components/knowledge/KnowledgeGraph";
import { useAppStore } from "~/stores/appStore";
import { api } from "~/utils/api";
import toast from "~/utils/toast";

type Tab = "docs" | "qa" | "graph";

export default function KnowledgePage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  const [activeTab, setActiveTab] = useState<Tab>("docs");
  const [searchText, setSearchText] = useState("");
  const [qaQuery, setQaQuery] = useState("");

  useEffect(() => {
    setBreadcrumbs([{ label: "知识", path: "/knowledge" }, { label: "知识库" }]);
  }, [setBreadcrumbs]);

  const { data: docs } = api.knowledge.list.useQuery({ searchText: searchText || undefined });
  const { data: stats } = api.knowledge.getStats.useQuery();
  const { data: qaResult, refetch: refetchQA } = api.knowledge.answer.useQuery(
    { query: qaQuery, userPermissionBm: 31 },
    { enabled: false },
  );
  const utils = api.useUtils();
  const createDoc = api.knowledge.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.knowledge.list.invalidate(),
        utils.knowledge.getStats.invalidate(),
      ]);
    },
  });

  const handleQa = async () => {
    if (!qaQuery.trim()) return;
    await refetchQA();
  };

  const fileTypeIcons: Record<string, string> = { pdf: "📄", docx: "📝", xlsx: "📊", csv: "📋", txt: "📃" };
  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "docs", label: "文档列表" },
    { key: "qa", label: "知识问答" },
    { key: "graph", label: "知识图谱" },
  ];

  return (
    <>
      <Head><title>数智企业 · 知识库</title></Head>
      <AppShell>
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">📚 知识库</h1>
              <p className="mt-1 text-sm text-gray-500">企业知识资产管理和检索</p>
            </div>
            <button onClick={async () => {
              const title = prompt("文档标题：");
              if (!title) return;
              const content = prompt("文档内容（支持多行粘贴）：");
              if (!content) return;
              try {
                await createDoc.mutateAsync({ title, content });
                toast("文档上传成功，已完成切片处理");
              } catch { toast("上传失败"); }
            }}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
              <Upload className="h-4 w-4" /> 上传文档
            </button>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>{tab.label}</button>
            ))}
          </div>

          {/* 文档列表 Tab */}
          {activeTab === "docs" && (
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1 space-y-3">
                {[
                  { label: "文档总数", value: stats?.totalDocs ?? 0 },
                  { label: "总大小", value: stats ? `${(stats.totalSize / 1024 / 1024).toFixed(1)}MB` : "0MB" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
                {stats?.byFileType && (
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="mb-2 text-xs font-semibold text-gray-500">文件类型</p>
                    {Object.entries(stats.byFileType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between py-1 text-sm">
                        <span>{fileTypeIcons[type] ?? "📄"} {type}</span>
                        <span className="font-medium text-gray-700">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-3 rounded-xl bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input value={searchText} onChange={(e) => setSearchText(e.target.value)}
                    placeholder="搜索文档..." className="flex-1 text-sm outline-none" />
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-3 font-medium text-gray-500">文档名</th>
                      <th className="pb-3 font-medium text-gray-500">类型</th>
                      <th className="pb-3 font-medium text-gray-500">权限</th>
                      <th className="pb-3 font-medium text-gray-500">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs?.map((doc) => (
                      <tr key={doc.id} className="border-b border-gray-50">
                        <td className="py-3 font-medium text-gray-800">{doc.title}</td>
                        <td className="py-3"><span className="text-lg">{fileTypeIcons[doc.fileType ?? ""] ?? "📄"}</span></td>
                        <td className="py-3">
                          <div className="flex gap-1">{doc.permissionTags.map((t) => (
                            <span key={t} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">{t}</span>
                          ))}</div>
                        </td>
                        <td className="py-3 text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString("zh-CN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 知识问答 Tab */}
          {activeTab === "qa" && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-bold text-gray-800">💡 向知识库提问</h3>
              <div className="mb-6 flex gap-3">
                <input value={qaQuery} onChange={(e) => setQaQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleQa(); }}
                  placeholder="输入您的问题，例如：新能源行业的最新趋势是什么？"
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm" />
                <button onClick={handleQa}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm text-white">
                  <Send className="h-4 w-4" /> 提问
                </button>
              </div>

              {qaResult && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-blue-50 p-4 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                    {qaResult.answer}
                  </div>
                  {qaResult.sources.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-gray-500">参考来源</p>
                      <div className="space-y-1.5">
                        {qaResult.sources.map((s) => (
                          <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-xs">
                            <span className="text-gray-700">{s.source}</span>
                            <span className="text-gray-400">相关性 {s.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 知识图谱 Tab */}
          {activeTab === "graph" && <KnowledgeGraph />}
        </div>
      </AppShell>
    </>
  );
}
