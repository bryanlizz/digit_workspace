// ─────────────────────────────────────────────────────────
// 数智企业 · 租户浏览器隔离
// 每个 tenantId 独立的 Playwright BrowserContext
// ─────────────────────────────────────────────────────────

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { BrowserSession, HumanInterventionEvent } from "./types";
import type { ExternalRecord, Screenshot, ToolArtifact } from "~/server/tools/types";
import type { BrowserStepResult } from "./iBrowserWorker";

/**
 * 为每个租户创建隔离的 BrowserContext
 */
class TenantBrowserPool {
  private browser: Browser | null = null;
  private contexts = new Map<string, BrowserContext>();
  private pages = new Map<string, Page>();
  private histories = new Map<string, Array<{ at: string; action: string; target?: string; value?: string }>>();
  private recordings = new Map<string, string>();

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  async getPage(session: BrowserSession): Promise<Page> {
    const contextKey = `${session.tenantId}:${session.id}`;

    const existing = this.pages.get(contextKey);
    if (existing && !existing.isClosed()) return existing;

    const browser = await this.getBrowser();
    const context = await browser.newContext({
      recordVideo: { dir: "./uploads/videos", size: { width: 1280, height: 720 } },
    });
    const page = await context.newPage();

    this.contexts.set(contextKey, context);
    this.pages.set(contextKey, page);
    return page;
  }

  record(session: BrowserSession, action: string, target?: string, value?: string): void {
    const key = `${session.tenantId}:${session.id}`;
    const history = this.histories.get(key) ?? [];
    history.push({ at: new Date().toISOString(), action, target, value });
    this.histories.set(key, history);
  }

  getHistory(session: BrowserSession): Array<{ at: string; action: string; target?: string; value?: string }> {
    return this.histories.get(`${session.tenantId}:${session.id}`) ?? [];
  }

  getVideoPath(session: BrowserSession): string | null {
    return this.recordings.get(`${session.tenantId}:${session.id}`) ?? null;
  }

  /** 获取某租户的所有活跃页面数 */
  getTenantSessionCount(tenantId: string): number {
    let count = 0;
    for (const [key] of this.pages) {
      if (key.startsWith(`${tenantId}:`)) count++;
    }
    return count;
  }

  async closeTenant(tenantId: string): Promise<void> {
    const prefix = `${tenantId}:`;
    for (const [key, context] of this.contexts) {
      if (key.startsWith(prefix)) {
        try {
          const page = this.pages.get(key);
          const videoPath = page ? await page.video()?.path() : null;
          if (videoPath) this.recordings.set(key, videoPath);
        } catch {}
        await context.close().catch(() => {});
        this.contexts.delete(key);
        this.pages.delete(key);
        this.histories.delete(key);
      }
    }
  }

  async closeAll(): Promise<void> {
    for (const context of this.contexts.values()) {
      await context.close().catch(() => {});
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
    }
    this.contexts.clear();
    this.pages.clear();
    this.histories.clear();
    this.browser = null;
  }
}

export const tenantBrowserPool = new TenantBrowserPool();
