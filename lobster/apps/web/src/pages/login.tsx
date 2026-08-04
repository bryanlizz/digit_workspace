import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "~/stores/authStore";

function getDefaultPath(): string {
  if (typeof window === "undefined") return "/";
  const p = window.location.port;
  if (p === "3001") return "/admin/gateway";
  if (p === "3002") return "/enterprise";
  if (p === "3003") return "/desktop";
  return "/";
}

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const defaultPath = getDefaultPath();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.push(defaultPath);
  }, [user, router, defaultPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const ok = await login(email, password);
    setLoading(false);

    if (ok) {
      router.push(defaultPath);
    } else {
      setError("邮箱或密码错误（测试账号：boss@lobster.com / lobster123）");
    }
  };

  return (
    <>
      <Head><title>登录 · 数智企业</title></Head>
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* 左侧品牌区 */}
        <div className="flex flex-col justify-center bg-gradient-to-br from-[#0d2b4b] to-[#1a3856] p-8 text-white md:w-1/2 md:p-16">
          <div className="mx-auto max-w-md">
            <div className="mb-8 flex items-center gap-4">
              <span className="text-5xl">🦞</span>
              <div>
                <h1 className="text-3xl font-bold tracking-wide">数智企业</h1>
                <p className="mt-1 text-blue-200/60">企业数字员工系统</p>
              </div>
            </div>
            <div className="space-y-6">
              {[
                { icon: "👁️", title: "看得见", desc: "3D 办公室，员工状态一目了然" },
                { icon: "🔒", title: "管得住", desc: "权限分层、审计追踪、责任链" },
                { icon: "💰", title: "用得起", desc: "预设 15 个岗位，零配置启动" },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-blue-200/60">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧登录表单 */}
        <div className="flex items-center justify-center bg-white p-8 md:w-1/2 md:p-16">
          <div className="w-full max-w-sm">
            <h2 className="mb-2 text-2xl font-bold text-gray-800">欢迎回来</h2>
            <p className="mb-8 text-sm text-gray-500">登录您的数智企业账号</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="boss@lobster.com" required
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入密码" required
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-10 text-sm focus:border-blue-400 focus:outline-none" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
                {loading ? "登录中..." : "登录"}
              </button>
            </form>

            <div className="mt-8 rounded-lg bg-gray-50 p-4">
              <p className="mb-2 text-xs font-semibold text-gray-500">测试账号</p>
              <div className="space-y-1.5 text-xs text-gray-500">
                <p><span className="font-medium text-gray-700">管理员：</span>boss@lobster.com / lobster123</p>
                <p><span className="font-medium text-gray-700">主管：</span>manager@lobster.com / lobster123</p>
                <p><span className="font-medium text-gray-700">员工：</span>staff@lobster.com / lobster123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
