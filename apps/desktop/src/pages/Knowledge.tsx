import { BookOpen } from "lucide-react";

export function KnowledgePage() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-rose-600" />
        <h1 className="text-xl font-bold text-gray-800">知识库</h1>
      </div>
      <p className="text-sm text-gray-500">企业知识检索与浏览</p>
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-400">
          知识库列表已接入
        </p>
      </div>
    </div>
  );
}
