// ─────────────────────────────────────────────────────────
// 数智企业 · IBrowserWorker 接口
// 从伪实现提取，供 Playwright 真实实现共用
// ─────────────────────────────────────────────────────────

import type { BrowserSession, BrowserOperationResult, HumanInterventionEvent } from "./types";
import type { ExternalRecord, Screenshot, ToolArtifact } from "~/server/tools/types";

export interface BrowserStepResult extends BrowserOperationResult {
  title?: string;
  url?: string;
  text?: string;
  externalRecords?: ExternalRecord[];
  artifacts?: ToolArtifact[];
  screenshots?: Screenshot[];
  data?: Record<string, unknown>;
  screenshot?: string;
  interventionEvent?: HumanInterventionEvent;
}

export interface IBrowserWorker {
  restoreCookies(session: BrowserSession, cookies: string): void;
  navigate(session: BrowserSession, url: string): Promise<BrowserStepResult>;
  click(session: BrowserSession, target: string): Promise<BrowserStepResult>;
  input(session: BrowserSession, name: string, value: string): BrowserStepResult;
  select(session: BrowserSession, name: string, value: string): BrowserStepResult;
  extractText(session: BrowserSession, selector?: string): BrowserStepResult;
  captureScreenshot(session: BrowserSession, name?: string): BrowserStepResult;
  captureRecording(session: BrowserSession, name?: string): BrowserStepResult;
  markHumanIntervention(session: BrowserSession, type: HumanInterventionEvent["type"], message: string): BrowserStepResult;
  getHistory(sessionId: string): Array<{ at: string; action: string; target?: string; value?: string; note?: string }>;
}
