let toastEl: HTMLDivElement | null = null;

export default function toast(msg: string) {
  if (typeof window === "undefined") return;
  if (toastEl) toastEl.remove();
  toastEl = document.createElement("div");
  toastEl.textContent = msg;
  toastEl.style.cssText =
    "position:fixed;bottom:24px;right:24px;background:#1f2937;color:#fff;padding:10px 16px;border-radius:8px;font-size:14px;z-index:9999;";
  document.body.appendChild(toastEl);
  setTimeout(() => toastEl?.remove(), 2500);
}
