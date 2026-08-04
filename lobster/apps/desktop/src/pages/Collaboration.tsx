import { Users } from "lucide-react";

export function CollaborationPage() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Users className="h-6 w-6 text-rose-600" />
        <h1 className="text-xl font-bold text-gray-800">协作空间</h1>
      </div>
      <p className="text-sm text-gray-500">团队协作与实时沟通</p>
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-400">
          协作列表已接入
        </p>
      </div>
    </div>
  );
}
