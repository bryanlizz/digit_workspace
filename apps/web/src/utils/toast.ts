/**
 * 简易 Toast 提示（V1 轻量实现）
 * V2 可替换为 react-hot-toast 或 sonner
 */

let toastId = 0;

export default function toast(message: string, duration = 2000) {
  // SSR 安全：在服务端不执行
  if (typeof document === "undefined") return;

  const id = `toast-${++toastId}`;

  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 flex flex-col items-center gap-2";
    document.body.appendChild(container);
  }

  const el = document.createElement("div");
  el.id = id;
  el.className =
    "animate-slide-up rounded-lg bg-gray-900 px-5 py-3 text-sm text-white shadow-xl backdrop-blur-sm";
  el.textContent = message;

  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s";
    setTimeout(() => el.remove(), 300);
  }, duration);
}
