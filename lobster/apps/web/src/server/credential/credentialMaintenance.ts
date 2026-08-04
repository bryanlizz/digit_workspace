// ─────────────────────────────────────────────────────────
// 数智企业 · 凭证维护定时任务
// 每 30 分钟刷新即将过期的 OAuth Token，停用不活跃 Token
// ─────────────────────────────────────────────────────────

import { credentialService } from "./credentialService";

let maintenanceInterval: ReturnType<typeof setInterval> | null = null;

export function startCredentialMaintenance(): void {
  if (maintenanceInterval) return;

  console.log("[CredentialMaintenance] 启动凭证维护定时任务（每 30 分钟）");

  void credentialService.scheduledMaintenance().then((result: { refreshed: number; deactivated: number }) => {
    console.log(`[CredentialMaintenance] 初始维护完成: 刷新 ${result.refreshed}, 停用 ${result.deactivated}`);
  });

  maintenanceInterval = setInterval(() => {
    void credentialService.scheduledMaintenance().then((result: { refreshed: number; deactivated: number }) => {
      if (result.refreshed > 0 || result.deactivated > 0) {
        console.log(`[CredentialMaintenance] 维护完成: 刷新 ${result.refreshed}, 停用 ${result.deactivated}`);
      }
    });
  }, 30 * 60 * 1000);
}

export function stopCredentialMaintenance(): void {
  if (maintenanceInterval) {
    clearInterval(maintenanceInterval);
    maintenanceInterval = null;
    console.log("[CredentialMaintenance] 已停止");
  }
}
