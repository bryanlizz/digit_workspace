import { useEffect, useState } from "react";
import { Settings } from "lucide-react";

const DEFAULT_API_URL = "http://localhost:3000";

export function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [token, setToken] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setApiUrl(localStorage.getItem("lobster_api_url") ?? DEFAULT_API_URL);
    setToken(localStorage.getItem("lobster_token") ?? "");
  }, []);

  const handleSave = () => {
    localStorage.setItem("lobster_api_url", apiUrl.trim() || DEFAULT_API_URL);
    if (token.trim()) {
      localStorage.setItem("lobster_token", token.trim());
    } else {
      localStorage.removeItem("lobster_token");
    }
    setSavedAt(new Date().toLocaleTimeString());
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Settings className="h-6 w-6 text-rose-600" />
        <h1 className="text-xl font-bold text-gray-800">设置</h1>
      </div>
      <p className="text-sm text-gray-500">配置 desktop 连接的 web API 地址和访问 token。</p>

      <div className="mt-6 space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-medium text-gray-700">服务器连接</h2>
          <label className="block text-xs font-medium text-gray-500">API URL</label>
          <input
            value={apiUrl}
            onChange={(event) => setApiUrl(event.target.value)}
            placeholder={DEFAULT_API_URL}
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
          />
          <p className="mt-2 text-xs text-gray-400">保存到 localStorage.lobster_api_url，tRPC 会请求该地址下的 /api/trpc。</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-medium text-gray-700">账户 token</h2>
          <label className="block text-xs font-medium text-gray-500">Authorization Token</label>
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            type="password"
            placeholder="可选，保存后作为 Bearer token 发送"
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
          />
          <p className="mt-2 text-xs text-gray-400">保存到 localStorage.lobster_token；留空保存会清除本地 token。</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-medium text-gray-700">当前状态</h2>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-400">连接地址</p>
              <p className="mt-1 truncate font-mono text-gray-800">{apiUrl || DEFAULT_API_URL}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-400">登录状态</p>
              <p className="mt-1 text-gray-800">{token.trim() ? "已配置 token" : "未配置 token"}</p>
            </div>
          </div>
          <button onClick={handleSave} className="mt-5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">
            保存设置
          </button>
          {savedAt && <span className="ml-3 text-xs text-green-600">已保存于 {savedAt}</span>}
        </div>
      </div>
    </div>
  );
}
