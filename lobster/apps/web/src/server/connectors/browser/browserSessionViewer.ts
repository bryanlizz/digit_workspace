// ─────────────────────────────────────────────────────────
// 数智企业 · 浏览器会话监控服务
// 提供活跃会话列表 + 实时截图流（非 VNC，通过定时截图实现远程查看）
// ─────────────────────────────────────────────────────────

import type { BrowserSession } from "./types";
import { browserWorker } from "./index";

interface SessionStatus {
  sessionId: string;
  title: string;
  currentUrl: string;
  startedAt: string;
  screenshotCount: number;
  actionCount: number;
  lastActivity: string;
}

interface SessionSnapshot {
  sessionId: string;
  screenshot: string | null; // base64 PNG
  url: string;
  title: string;
  capturedAt: string;
}

class BrowserSessionViewer {
  /** 获取所有活跃会话状态（从 PlaywrightWorker 的 pages map 推断） */
  getActiveSessions(): SessionStatus[] {
    // 通过 browserWorker 的类型判断是否支持 getSessions
    const worker = browserWorker as any;
    if (typeof worker.getSessions === "function") {
      return worker.getSessions() as SessionStatus[];
    }
    // fallback: 返回空列表（fetch-based worker 无活跃会话概念）
    return [];
  }

  /** 获取某会话的实时截图 */
  async captureSnapshot(sessionId: string): Promise<SessionSnapshot | null> {
    const worker = browserWorker as any;

    // 尝试通过 worker 获取当前页面截图
    if (typeof worker.getActivePageUrl === "function") {
      const url = worker.getActivePageUrl?.(sessionId) ?? "about:blank";
      const title = worker.getActivePageTitle?.(sessionId) ?? "未知";

      let screenshot: string | null = null;
      if (typeof worker.captureLiveScreenshot === "function") {
        screenshot = await worker.captureLiveScreenshot(sessionId);
      }

      return {
        sessionId,
        screenshot,
        url,
        title,
        capturedAt: new Date().toISOString(),
      };
    }
    return null;
  }

  /** 获取指定会话的历史操作记录 */
  getSessionHistory(sessionId: string): Array<{ at: string; action: string; target?: string; value?: string }> {
    return browserWorker.getHistory(sessionId);
  }
}

export const browserSessionViewer = new BrowserSessionViewer();
