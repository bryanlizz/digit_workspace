// ─────────────────────────────────────────────────────────
// 浏览器 Worker
// 基于 fetch + 轻量页面快照提供导航、点击、输入、选择、提取与留痕能力
// ─────────────────────────────────────────────────────────

import type { ExternalRecord, Screenshot, ToolArtifact } from "~/server/tools/types";
import type { BrowserOperationResult, BrowserSession, HumanInterventionEvent } from "./types";
import type { BrowserStepResult } from "./iBrowserWorker";

interface BrowserActionEntry {
  at: string;
  action: string;
  target?: string;
  value?: string;
  note?: string;
}

interface BrowserRuntimeState {
  sessionId: string;
  currentUrl: string;
  title: string;
  html: string;
  text: string;
  cookies?: string;
  fields: Record<string, string>;
  history: BrowserActionEntry[];
  screenshots: Screenshot[];
  recordings: Array<{ name: string; data: string; at: string }>;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function snippet(text: string, limit = 280): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

function svgEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderSnapshotSvg(state: BrowserRuntimeState, label: string): string {
  const lines = [
    `Session: ${state.sessionId}`,
    `Label: ${label}`,
    `URL: ${state.currentUrl}`,
    `Title: ${state.title || "(none)"}`,
    `Fields: ${Object.keys(state.fields).length}`,
    ...snippet(state.text, 420).match(/.{1,110}/g)?.slice(0, 4) ?? ["(empty page)"],
  ];

  const body = lines
    .map((line, index) => `<text x="24" y="${46 + index * 28}" font-family="Menlo, Consolas, monospace" font-size="18" fill="#111827">${svgEscape(line)}</text>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="18" y="18" width="1244" height="684" rx="20" fill="#ffffff" stroke="#dbeafe"/>
  <text x="24" y="34" font-family="Menlo, Consolas, monospace" font-size="14" fill="#64748b">Browser Snapshot</text>
  ${body}
</svg>`;
}

function buildResultBase(state: BrowserRuntimeState): Pick<BrowserStepResult, "title" | "url" | "text" | "externalRecords"> {
  return {
    title: state.title,
    url: state.currentUrl,
    text: state.text,
    externalRecords: [{ system: "browser", id: state.currentUrl, type: "page", url: state.currentUrl }],
  };
}

function toHumanIntervention(session: BrowserSession, type: HumanInterventionEvent["type"], message: string): BrowserStepResult {
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

/**
 * 浏览器 Worker
 */
export class BrowserWorker {
  private states = new Map<string, BrowserRuntimeState>();

  private getState(session: BrowserSession): BrowserRuntimeState {
    const existing = this.states.get(session.id);
    if (existing) return existing;

    const state: BrowserRuntimeState = {
      sessionId: session.id,
      currentUrl: session.currentUrl ?? "about:blank",
      title: "",
      html: "",
      text: "",
      fields: {},
      history: [],
      screenshots: [],
      recordings: [],
      cookies: undefined,
    };

    this.states.set(session.id, state);
    return state;
  }

  restoreCookies(session: BrowserSession, cookies: string): void {
    const state = this.getState(session);
    state.cookies = cookies;
    session.currentUrl = session.currentUrl ?? state.currentUrl;
  }

  async navigate(session: BrowserSession, url: string): Promise<BrowserStepResult> {
    const state = this.getState(session);
    try {
      const response = await fetch(url, {
        headers: state.cookies ? { cookie: state.cookies } : undefined,
      });
      const html = await response.text();
      state.currentUrl = response.url || url;
      state.html = html;
      state.title = extractTitle(html);
      state.text = stripHtml(html);
      state.history.push({ at: new Date().toISOString(), action: "navigate", target: state.currentUrl });
      session.currentUrl = state.currentUrl;
      return {
        success: true,
        ...buildResultBase(state),
        data: { status: response.status, finalUrl: response.url || url },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "浏览器导航失败";
      return {
        success: false,
        error: message,
      };
    }
  }

  async click(session: BrowserSession, target: string): Promise<BrowserStepResult> {
    const state = this.getState(session);
    const candidate = this.findTargetHref(state.html, target);
    state.history.push({ at: new Date().toISOString(), action: "click", target });

    if (!candidate) {
      return {
        success: false,
        error: `未找到可点击元素: ${target}`,
        ...buildResultBase(state),
      };
    }

    return this.navigate(session, new URL(candidate, state.currentUrl).toString());
  }

  input(session: BrowserSession, name: string, value: string): BrowserStepResult {
    const state = this.getState(session);
    state.fields[name] = value;
    state.history.push({ at: new Date().toISOString(), action: "input", target: name, value });
    return { success: true, ...buildResultBase(state), data: { name, value } };
  }

  select(session: BrowserSession, name: string, value: string): BrowserStepResult {
    const state = this.getState(session);
    state.fields[name] = value;
    state.history.push({ at: new Date().toISOString(), action: "select", target: name, value });
    return { success: true, ...buildResultBase(state), data: { name, value } };
  }

  extractText(session: BrowserSession, selector?: string): BrowserStepResult {
    const state = this.getState(session);
    const text = selector ? this.extractBySelector(state.html, selector) : state.text;
    state.history.push({ at: new Date().toISOString(), action: "extract", target: selector ?? "document" });
    return { success: true, ...buildResultBase(state), text, data: { selector: selector ?? null, text } };
  }

  captureScreenshot(session: BrowserSession, name = "page"): BrowserStepResult {
    const state = this.getState(session);
    const svg = renderSnapshotSvg(state, name);
    const data = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    const screenshot: Screenshot = { name, data };
    const artifact: ToolArtifact = { name: `${name}.svg`, mimeType: "image/svg+xml", data: svg, type: "screenshot" };
    const externalRecord: ExternalRecord = { system: "browser", id: `${state.sessionId}:${name}`, type: "screenshot", url: state.currentUrl };
    state.screenshots.push(screenshot);
    state.history.push({ at: new Date().toISOString(), action: "screenshot", target: name });
    session.lastScreenshot = name;
    return {
      success: true,
      ...buildResultBase(state),
      screenshot: data,
      screenshots: [screenshot],
      artifacts: [artifact],
      externalRecords: [externalRecord],
      data: { name, url: state.currentUrl },
    };
  }

  captureRecording(session: BrowserSession, name = "recording"): BrowserStepResult {
    const state = this.getState(session);
    const payload = {
      sessionId: state.sessionId,
      url: state.currentUrl,
      title: state.title,
      fields: state.fields,
      history: state.history,
    };
    const data = JSON.stringify(payload, null, 2);
    state.recordings.push({ name, data, at: new Date().toISOString() });
    state.history.push({ at: new Date().toISOString(), action: "recording", target: name });
    session.lastRecording = name;
    return {
      success: true,
      ...buildResultBase(state),
      artifacts: [{ name: `${name}.json`, mimeType: "application/json", data, type: "file" }],
      externalRecords: [{ system: "browser", id: `${state.sessionId}:${name}`, type: "recording", url: state.currentUrl, metadata: { actionCount: state.history.length } }],
      data: payload,
    };
  }

  markHumanIntervention(session: BrowserSession, type: HumanInterventionEvent["type"], message: string): BrowserStepResult {
    const state = this.getState(session);
    const svg = renderSnapshotSvg(state, "intervention");
    const data = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    const screenshot: Screenshot = { name: "intervention", data };
    const artifact: ToolArtifact = { name: "intervention.svg", mimeType: "image/svg+xml", data: svg, type: "screenshot" };
    state.history.push({ at: new Date().toISOString(), action: "intervention", note: type, target: message });
    return {
      ...toHumanIntervention(session, type, message),
      screenshot: data,
      screenshots: [screenshot],
      artifacts: [artifact],
      externalRecords: [{ system: "browser", id: `${state.sessionId}:intervention`, type: "screenshot", url: state.currentUrl }],
      data: { type, message },
    };
  }

  getHistory(sessionId: string): BrowserActionEntry[] {
    return this.states.get(sessionId)?.history ?? [];
  }

  private findTargetHref(html: string, target: string): string | null {
    if (!html) return null;
    if (/^https?:\/\//i.test(target) || target.startsWith("/")) {
      return target;
    }

    const normalTarget = target.replace(/\s+/g, "").toLowerCase();
    const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(anchorPattern)) {
      const href = match[1] ?? "";
      const text = stripHtml(match[2] ?? "").replace(/\s+/g, "").toLowerCase();
      if (!text) continue;
      if (text.includes(normalTarget) || normalTarget.includes(text)) {
        return href;
      }
    }

    return null;
  }

  private extractBySelector(html: string, selector: string): string {
    if (!selector) return stripHtml(html);

    const id = selector.startsWith("#") ? selector.slice(1) : null;
    if (id) {
      const match = html.match(new RegExp(`<[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i"));
      if (match?.[1]) return stripHtml(match[1]);
    }

    const className = selector.startsWith(".") ? selector.slice(1) : null;
    if (className) {
      const match = html.match(new RegExp(`<[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i"));
      if (match?.[1]) return stripHtml(match[1]);
    }

    return stripHtml(html);
  }
}
