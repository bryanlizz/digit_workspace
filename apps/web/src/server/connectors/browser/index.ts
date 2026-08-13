// ─────────────────────────────────────────────────────────
// 浏览器自动化模块
// 根据 BROWSER_DRIVER 环境变量选择实现
// ─────────────────────────────────────────────────────────

import { env } from "~/env";
import { BrowserWorker } from "./worker";
import { PlaywrightBrowserWorker } from "./playwrightWorker";

function createBrowserWorker(): BrowserWorker | PlaywrightBrowserWorker {
  if (env.BROWSER_DRIVER === "playwright") {
    console.log("[Browser] Using Playwright (real Chromium)");
    return new PlaywrightBrowserWorker();
  }
  console.log("[Browser] Using fetch-based worker (mock)");
  return new BrowserWorker();
}

export const browserWorker = createBrowserWorker();

export * from "./types";
export * from "./session";
export * from "./worker";
export * from "./bossConnector";
