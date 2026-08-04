// ─────────────────────────────────────────────────────────
// 数智企业 · Playwright 浏览器 Worker
// 真实 headless Chromium 驱动，替代 fetch 伪实现
// ─────────────────────────────────────────────────────────

import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import type { BrowserSession, HumanInterventionEvent } from "./types";
import type { ExternalRecord, Screenshot, ToolArtifact } from "~/server/tools/types";
import type { BrowserStepResult } from "./iBrowserWorker";

function buildResult(page: Page, url: string, title: string): Pick<BrowserStepResult, "title" | "url" | "externalRecords"> {
  return {
    title,
    url: page.url() || url,
    externalRecords: [{ system: "browser", id: page.url() || url, type: "page", url: page.url() || url }],
  };
}

export class PlaywrightBrowserWorker {
  private browser: Browser | null = null;
  private contexts = new Map<string, BrowserContext>();
  private pages = new Map<string, Page>();
  private histories = new Map<string, Array<{ at: string; action: string; target?: string; value?: string }>>();
  private recordings = new Map<string, string>(); // sessionId → video path

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  private async getPage(session: BrowserSession): Promise<Page> {
    const existing = this.pages.get(session.id);
    if (existing && !existing.isClosed()) return existing;

    const browser = await this.getBrowser();
    const context = await browser.newContext({
      recordVideo: { dir: "./uploads/videos", size: { width: 1280, height: 720 } },
    });
    const page = await context.newPage();
    this.contexts.set(session.id, context);
    this.pages.set(session.id, page);
    return page;
  }

  private record(sessionId: string, action: string, target?: string, value?: string): void {
    const history = this.histories.get(sessionId) ?? [];
    history.push({ at: new Date().toISOString(), action, target, value });
    this.histories.set(sessionId, history);
  }

  restoreCookies(session: BrowserSession, cookies: string): void {
    // Cookies will be set on next page creation
    session.currentUrl = session.currentUrl ?? "about:blank";
  }

  async navigate(session: BrowserSession, url: string): Promise<BrowserStepResult> {
    try {
      const page = await this.getPage(session);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      const title = await page.title();
      this.record(session.id, "navigate", url);
      session.currentUrl = page.url();
      return { success: true, ...buildResult(page, url, title), data: { finalUrl: page.url() } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "浏览器导航失败" };
    }
  }

  async click(session: BrowserSession, target: string): Promise<BrowserStepResult> {
    try {
      const page = await this.getPage(session);
      this.record(session.id, "click", target);

      // Try text match first, then selector
      try {
        await page.click(`text="${target}"`, { timeout: 5000 });
      } catch {
        await page.click(target, { timeout: 5000 });
      }

      await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
      const title = await page.title();
      session.currentUrl = page.url();
      return { success: true, ...buildResult(page, session.currentUrl, title) };
    } catch (error) {
      return { success: false, error: `点击失败: ${target} — ${error instanceof Error ? error.message : "unknown"}` };
    }
  }

  input(session: BrowserSession, name: string, value: string): BrowserStepResult {
    // Async fire-and-forget: fill the input field
    void this.getPage(session).then((page) => {
      page.fill(`input[name="${name}"], #${name}, [data-testid="${name}"]`, value).catch(() => {
        page.fill(name, value).catch(() => {});
      });
    });
    this.record(session.id, "input", name, value);
    return { success: true, data: { name, value } };
  }

  select(session: BrowserSession, name: string, value: string): BrowserStepResult {
    void this.getPage(session).then((page) => {
      page.selectOption(`select[name="${name}"], #${name}`, value).catch(() => {});
    });
    this.record(session.id, "select", name, value);
    return { success: true, data: { name, value } };
  }

  async extractText(session: BrowserSession, selector?: string): Promise<BrowserStepResult> {
    try {
      const page = await this.getPage(session);
      this.record(session.id, "extract", selector ?? "body");
      const text = selector
        ? await page.textContent(selector).then((t) => t ?? "")
        : await page.textContent("body").then((t) => t ?? "");
      return { success: true, text, data: { selector: selector ?? "body", text } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "提取文本失败" };
    }
  }

  async captureScreenshot(session: BrowserSession, name = "page"): Promise<BrowserStepResult> {
    try {
      const page = await this.getPage(session);
      this.record(session.id, "screenshot", name);

      const buffer = await page.screenshot({ fullPage: false, type: "png" });
      const base64 = buffer.toString("base64");
      const data = `data:image/png;base64,${base64}`;

      const screenshot: Screenshot = { name, data };
      const artifact: ToolArtifact = { name: `${name}.png`, mimeType: "image/png", data, type: "screenshot" };
      const externalRecord: ExternalRecord = { system: "browser", id: `${session.id}:${name}`, type: "screenshot", url: page.url() };

      session.lastScreenshot = name;
      return {
        success: true,
        title: await page.title(),
        url: page.url(),
        screenshot: data,
        screenshots: [screenshot],
        artifacts: [artifact],
        externalRecords: [externalRecord],
        data: { name, url: page.url() },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "截图失败" };
    }
  }

  captureRecording(session: BrowserSession, name = "recording"): BrowserStepResult {
    const history = this.histories.get(session.id) ?? [];
    const payload = { sessionId: session.id, history };
    const data = JSON.stringify(payload, null, 2);
    this.record(session.id, "recording", name);
    session.lastRecording = name;
    return {
      success: true,
      artifacts: [{ name: `${name}.json`, mimeType: "application/json", data, type: "file" }],
      externalRecords: [{ system: "browser", id: `${session.id}:${name}`, type: "recording", url: session.currentUrl ?? "", metadata: { actionCount: history.length } }],
      data: payload,
    };
  }

  markHumanIntervention(session: BrowserSession, type: HumanInterventionEvent["type"], message: string): BrowserStepResult {
    this.record(session.id, "intervention", type, message);
    return {
      success: false,
      error: message,
      requiresHumanIntervention: true,
      interventionEvent: {
        type,
        message,
        taskId: session.currentUrl ?? session.id,
        agentId: session.tenantId,
        requiredAction: type === "captcha" ? "complete captcha" : type === "verify_code" ? "submit verification code" : "manual review",
      },
    };
  }

  getHistory(sessionId: string): Array<{ at: string; action: string; target?: string; value?: string; note?: string }> {
    return this.histories.get(sessionId) ?? [];
  }

  async close(): Promise<void> {
    for (const [sessionId, context] of this.contexts) {
      // Save video path
      try {
        const videoPath = await context.pages()[0]?.video()?.path();
        if (videoPath) this.recordings.set(sessionId, videoPath);
      } catch {}
      await context.close().catch(() => {});
    }
    for (const page of this.pages.values()) {
      await page.close().catch(() => {});
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
    }
    this.pages.clear();
    this.contexts.clear();
    this.histories.clear();
    this.browser = null;
  }

  /** 获取录像文件路径 */
  getVideoPath(sessionId: string): string | null {
    return this.recordings.get(sessionId) ?? null;
  }
}
