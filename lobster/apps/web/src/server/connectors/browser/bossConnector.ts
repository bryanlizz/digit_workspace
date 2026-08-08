// ─────────────────────────────────────────────────────────
// Boss 直聘 Connector
// 浏览器自动化操作 Boss 直聘
// ─────────────────────────────────────────────────────────

import type { ToolDefinition, ToolCallResult, ToolCallContext } from "~/server/tools/types";
import { withAudit } from "~/server/tools/toolAudit";
import { toolRegistry } from "~/server/tools/toolRegistry";
import { vaultService } from "~/server/vault";
import { sessionManager } from "./session";
import { browserWorker } from "./index";
import type {
  BossSearchParams,
  BossCandidate,
  BossSearchResult,
  BossGreetResult,
  BossResume,
  BrowserSession,
} from "./types";

function buildResumeFromText(text: string, userId: string): BossResume {
  const titleMatch = text.match(/(前端|后端|全栈|测试|算法|产品|设计)[^。\n]{0,20}/);
  const nameMatch = text.match(/姓名[:：\s]*([一-龥]{2,4})/);
  const companyMatch = text.match(/公司[:：\s]*([^\s，。]{2,20})/);
  const degreeMatch = text.match(/学历[:：\s]*([^\s，。]{2,10})/);

  return {
    name: nameMatch?.[1] ?? `候选人-${userId.slice(0, 6)}`,
    gender: undefined,
    age: undefined,
    degree: degreeMatch?.[1] ?? "",
    school: undefined,
    workYear: undefined,
    title: titleMatch?.[0]?.trim() ?? "",
    company: companyMatch?.[1] ?? "",
    workExperience: [
      {
        company: companyMatch?.[1] ?? "",
        title: titleMatch?.[0]?.trim() ?? "",
        duration: "",
        description: text.slice(0, 220),
      },
    ],
    education: [],
    skills: [],
  };
}

function buildGreetResult(userId: string): BossGreetResult {
  return {
    success: true,
    messageId: `boss_msg_${userId}_${Date.now()}`,
  };
}

const BOSS_CONFIG = {
  baseUrl: "https://www.zhipin.com",
  loginUrl: "https://www.zhipin.com/web/user/",
  searchUrl: "https://www.zhipin.com/web/geek/index",
  greetUrl: "https://www.zhipin.com/web/geek/chat",
  resumeUrl: "https://www.zhipin.com/web/geek/resume",
  greetCooldownMs: 5000,
  maxGreetsPerHour: 50,
  maxSearchPerHour: 100,
};

const operationCounts = new Map<string, { greet: number; search: number; lastReset: Date }>();

function detectIntervention(result: { error?: string; requiresHumanIntervention?: boolean }, session: BrowserSession) {
  const message = result.error ?? "需要人工接管";
  if (!message) return null;

  if (message.includes("验证码")) {
    return browserWorker.markHumanIntervention(session, "captcha", message);
  }
  if (message.includes("登录") || message.includes("失效")) {
    return browserWorker.markHumanIntervention(session, "login_expired", message);
  }
  if (message.includes("风控") || message.includes("被封")) {
    return browserWorker.markHumanIntervention(session, "risk_alert", message);
  }
  if (message.includes("改版") || message.includes("页面")) {
    return browserWorker.markHumanIntervention(session, "page_change", message);
  }
  if (result.requiresHumanIntervention) {
    return browserWorker.markHumanIntervention(session, "manual_required", message);
  }

  return null;
}

function toSessionRecord(sessionId: string): BrowserSession | undefined {
  return sessionManager.getSession(sessionId);
}

function buildSearchResults(keyword?: string, city?: string, page = 1): BossSearchResult {
  const candidates: BossCandidate[] = [
    {
      userId: "candidate_001",
      name: "张三",
      title: "高级前端工程师",
      company: "某科技公司",
      workYear: "3-5年",
      degree: "本科",
      activeTime: "今日活跃",
      tags: ["React", "Vue", "TypeScript"],
      expectPosition: keyword,
    },
    {
      userId: "candidate_002",
      name: "李四",
      title: "全栈工程师",
      company: "互联网公司",
      workYear: "5-10年",
      degree: "硕士",
      activeTime: "1 天内活跃",
      tags: ["Node.js", "React", "MySQL"],
      expectPosition: city ? `${city} 技术岗` : undefined,
    },
  ];

  return {
    success: true,
    candidates,
    totalCount: candidates.length,
    page,
    pageSize: 15,
    hasMore: false,
  };
}

/**
 * 重置计数
 */
function resetCountsIfNeeded(agentId: string): void {
  const counts = operationCounts.get(agentId) ?? { greet: 0, search: 0, lastReset: new Date() };
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

  if (counts.lastReset < hourAgo) {
    counts.greet = 0;
    counts.search = 0;
    counts.lastReset = new Date();
    operationCounts.set(agentId, counts);
  }
}

/**
 * 检查操作频率
 */
function checkRateLimit(
  agentId: string,
  operation: "greet" | "search"
): { allowed: boolean; remaining: number; nextReset: Date } {
  resetCountsIfNeeded(agentId);
  const counts = operationCounts.get(agentId)!;

  if (operation === "greet") {
    const remaining = BOSS_CONFIG.maxGreetsPerHour - counts.greet;
    return {
      allowed: remaining > 0,
      remaining,
      nextReset: new Date(counts.lastReset.getTime() + 60 * 60 * 1000),
    };
  } else {
    const remaining = BOSS_CONFIG.maxSearchPerHour - counts.search;
    return {
      allowed: remaining > 0,
      remaining,
      nextReset: new Date(counts.lastReset.getTime() + 60 * 60 * 1000),
    };
  }
}

/**
 * 记录操作
 */
function recordOperation(agentId: string, operation: "greet" | "search"): void {
  resetCountsIfNeeded(agentId);
  const counts = operationCounts.get(agentId)!;
  counts[operation]++;
  operationCounts.set(agentId, counts);
}

// ─────────────────────────────────────────────────────────
// Tool 定义
// ─────────────────────────────────────────────────────────

/**
 * Boss 登录 Tool
 */
export const bossLoginTool: ToolDefinition = {
  id: "boss.login",
  name: "Boss 直聘登录",
  description: "登录 Boss 直聘账号。登录成功后 Cookie 会自动保存，后续操作无需重复登录。",
  systemType: "boss",
  requiredLevel: 1, // L1: 只需要登录，不涉及敏感操作
  requiresApproval: false,
  parameters: [
    {
      name: "credentialId",
      type: "string",
      description: "Boss 凭证 ID（手机号+密码，配置在 Vault 中）",
      required: true,
    },
    {
      name: "sessionLabel",
      type: "string",
      description: "会话标签（如 'main', 'backup'），用于区分多个账号",
      required: false,
    },
  ],
  outputSchema: {
    type: "object",
    description: "返回登录结果和用户信息",
  },
};

/**
 * Boss 搜索候选人 Tool
 */
export const bossSearchTool: ToolDefinition = {
  id: "boss.search",
  name: "Boss 直聘搜索候选人",
  description: "在 Boss 直聘上搜索符合条件的候选人。返回候选人列表信息。",
  systemType: "boss",
  requiredLevel: 1, // L1: 只读查询
  requiresApproval: false,
  parameters: [
    {
      name: "sessionId",
      type: "string",
      description: "浏览器会话 ID（登录后获得）",
      required: true,
    },
    {
      name: "keyword",
      type: "string",
      description: "搜索关键词（职位、技能等）",
      required: false,
    },
    {
      name: "city",
      type: "string",
      description: "工作城市（如 '北京'、'上海-浦东'）",
      required: false,
    },
    {
      name: "workYear",
      type: "string",
      description: "工作年限（如 '1-3年'、'3-5年'、'5-10年'）",
      required: false,
    },
    {
      name: "degree",
      type: "string",
      description: "学历要求（如 '本科'、'硕士'、'博士'）",
      required: false,
    },
    {
      name: "salary",
      type: "string",
      description: "薪资范围（如 '25k-50k'）",
      required: false,
    },
    {
      name: "page",
      type: "number",
      description: "页码，默认第 1 页",
      required: false,
    },
  ],
  outputSchema: {
    type: "object",
    description: "返回候选人列表和总数",
  },
};

/**
 * Boss 打招呼 Tool
 */
export const bossGreetTool: ToolDefinition = {
  id: "boss.greet",
  name: "Boss 直聘打招呼",
  description: "向候选人发送招呼消息。注意：频率过快可能导致账号被封。",
  systemType: "boss",
  requiredLevel: 4, // L4: 发送外部消息
  requiresApproval: true, // 打招呼需要审批
  parameters: [
    {
      name: "sessionId",
      type: "string",
      description: "浏览器会话 ID",
      required: true,
    },
    {
      name: "userId",
      type: "string",
      description: "候选人用户 ID",
      required: true,
    },
    {
      name: "message",
      type: "string",
      description: "招呼语内容（如果为空使用默认话术）",
      required: false,
    },
    {
      name: "quickChatId",
      type: "string",
      description: "快速沟通话术 ID（使用 Boss 自带话术）",
      required: false,
    },
  ],
  outputSchema: {
    type: "object",
    description: "返回打招呼结果",
  },
};

/**
 * Boss 获取简历 Tool
 */
export const bossResumeTool: ToolDefinition = {
  id: "boss.resume",
  name: "Boss 直聘获取简历",
  description: "获取候选人的详细简历信息。",
  systemType: "boss",
  requiredLevel: 1, // L1: 只读查询
  requiresApproval: false,
  parameters: [
    {
      name: "sessionId",
      type: "string",
      description: "浏览器会话 ID",
      required: true,
    },
    {
      name: "userId",
      type: "string",
      description: "候选人用户 ID",
      required: true,
    },
  ],
  outputSchema: {
    type: "object",
    description: "返回候选人详细简历",
  },
};

// ─────────────────────────────────────────────────────────
// 执行器实现
// 注意：这里是抽象实现，需要在安装 Playwright 后实现具体浏览器操作
// ─────────────────────────────────────────────────────────

/**
 * Boss 登录执行器
 */
const bossLoginExecutor = withAudit(async (tool, params, context) => {
  const startTime = Date.now();
  const p = params as { credentialId: string; sessionLabel?: string };

  try {
    const credData = await vaultService.getCredentialData(p.credentialId, context.agentId);
    if (!credData) {
      return {
        success: false,
        error: "未找到 Boss 凭证或无权限访问",
        executionTimeMs: Date.now() - startTime,
      };
    }

    const cred = JSON.parse(credData.data) as { cookies?: string; userInfo?: { userId?: string; userName?: string; companyId?: string; companyName?: string; avatar?: string } };
    const session = await sessionManager.createSession(p.sessionLabel ?? "default", context.tenantId);

    if (cred.cookies) {
      browserWorker.restoreCookies(session, cred.cookies);
      await sessionManager.saveBossCookies(session.id, context.agentId, cred.cookies);
    }

    const userInfo =
      cred.userInfo && cred.userInfo.userId && cred.userInfo.userName && cred.userInfo.companyId && cred.userInfo.companyName
        ? {
            userId: cred.userInfo.userId,
            userName: cred.userInfo.userName,
            companyId: cred.userInfo.companyId,
            companyName: cred.userInfo.companyName,
            avatar: cred.userInfo.avatar,
          }
        : {
            userId: `boss_${session.id.slice(0, 8)}`,
            userName: "用户",
            companyId: "mock_company",
            companyName: "公司名",
          };

    sessionManager.setUserInfo(session.id, userInfo);
    sessionManager.updateSession(session.id, { currentUrl: BOSS_CONFIG.loginUrl });
    browserWorker.input(session, "credentialId", p.credentialId);

    return {
      success: true,
      data: {
        sessionId: session.id,
        userInfo,
      },
      externalRecordId: session.id,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[Boss] 登录失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "登录失败",
      executionTimeMs: Date.now() - startTime,
    };
  }
});

/**
 * Boss 搜索执行器
 */
const bossSearchExecutor = withAudit(async (tool, params, context) => {
  const startTime = Date.now();
  const p = params as unknown as BossSearchParams & { sessionId: string };

  try {
    const rateLimit = checkRateLimit(context.agentId, "search");
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `搜索频率超限，请 ${Math.ceil((rateLimit.nextReset.getTime() - Date.now()) / 60000)} 分钟后重试`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const session = toSessionRecord(p.sessionId);
    if (!session) {
      return {
        success: false,
        error: "会话不存在或已过期，请重新登录",
        executionTimeMs: Date.now() - startTime,
      };
    }

    if (!session.isLoggedIn) {
      const intervention = detectIntervention({ error: "未登录，请先执行登录操作" }, session);
      return {
        success: false,
        error: "未登录，请先执行登录操作",
        requiresHumanIntervention: !!intervention,
        interventionReason: intervention?.error,
        interventionEvent: intervention?.interventionEvent,
        screenshots: intervention?.screenshots,
        artifacts: intervention?.artifacts,
        externalRecords: intervention?.externalRecords,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const targetUrl = new URL(BOSS_CONFIG.searchUrl);
    if (p.keyword) targetUrl.searchParams.set("query", p.keyword);
    if (p.city) targetUrl.searchParams.set("city", p.city);
    if (p.workYear) targetUrl.searchParams.set("workYear", p.workYear);
    if (p.degree) targetUrl.searchParams.set("degree", p.degree);
    if (p.salary) targetUrl.searchParams.set("salary", p.salary);
    if (p.page) targetUrl.searchParams.set("page", String(p.page));

    const pageResult = await browserWorker.navigate(session, targetUrl.toString());
    if (!pageResult.success) {
      const intervention = detectIntervention(pageResult, session);
      return {
        ...pageResult,
        requiresHumanIntervention: !!intervention || pageResult.requiresHumanIntervention,
        interventionReason: intervention?.error ?? pageResult.error,
        interventionEvent: intervention?.interventionEvent ?? pageResult.interventionEvent,
        screenshots: intervention?.screenshots ?? pageResult.screenshots,
        artifacts: intervention?.artifacts ?? pageResult.artifacts,
        externalRecords: intervention?.externalRecords ?? pageResult.externalRecords,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const results = buildSearchResults(p.keyword, p.city, p.page ?? 1);
    recordOperation(context.agentId, "search");

    return {
      ...results,
      title: pageResult.title,
      url: pageResult.url,
      text: pageResult.text,
      artifacts: pageResult.artifacts,
      externalRecords: pageResult.externalRecords,
      screenshots: pageResult.screenshots,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[Boss] 搜索失败:", error);
    const message = error instanceof Error ? error.message : "搜索失败";
    const session = toSessionRecord(p.sessionId);
    const intervention = session ? detectIntervention({ error: message }, session) : null;
    return {
      success: false,
      error: message,
      requiresHumanIntervention: !!intervention,
      interventionReason: intervention?.error,
      interventionEvent: intervention?.interventionEvent,
      screenshots: intervention?.screenshots,
      artifacts: intervention?.artifacts,
      externalRecords: intervention?.externalRecords,
      executionTimeMs: Date.now() - startTime,
    };
  }
});

/**
 * Boss 打招呼执行器
 */
const bossGreetExecutor = withAudit(async (tool, params, context) => {
  const startTime = Date.now();
  const p = params as { sessionId: string; userId: string; message?: string; quickChatId?: string };

  try {
    const rateLimit = checkRateLimit(context.agentId, "greet");
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `打招呼频率超限（每小时最多 ${BOSS_CONFIG.maxGreetsPerHour} 次），请 ${Math.ceil((rateLimit.nextReset.getTime() - Date.now()) / 60000)} 分钟后重试`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const session = sessionManager.getSession(p.sessionId);
    if (!session || !session.isLoggedIn) {
      return {
        success: false,
        error: "会话不存在或未登录",
        executionTimeMs: Date.now() - startTime,
      };
    }

    const targetUrl = `${BOSS_CONFIG.greetUrl}?uid=${encodeURIComponent(p.userId)}`;
    const pageResult = await browserWorker.navigate(session, targetUrl);
    if (!pageResult.success) {
      const intervention = detectIntervention(pageResult, session);
      return {
        ...pageResult,
        requiresHumanIntervention: !!intervention || pageResult.requiresHumanIntervention,
        interventionReason: intervention?.error ?? pageResult.error,
        interventionEvent: intervention?.interventionEvent ?? pageResult.interventionEvent,
        screenshots: intervention?.screenshots ?? pageResult.screenshots,
        artifacts: intervention?.artifacts ?? pageResult.artifacts,
        externalRecords: intervention?.externalRecords ?? pageResult.externalRecords,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const recording = await browserWorker.captureRecording(session, "greet-session");
    const result = buildGreetResult(p.userId);
    recordOperation(context.agentId, "greet");

    return {
      success: true,
      data: result,
      externalRecordId: result.messageId,
      externalRecords: [...(pageResult.externalRecords ?? []), ...(recording.externalRecords ?? [])],
      artifacts: recording.artifacts,
      screenshots: pageResult.screenshots,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[Boss] 打招呼失败:", error);
    const errorMessage = error instanceof Error ? error.message : "打招呼失败";
    const session = sessionManager.getSession(p.sessionId);
    const intervention = session ? detectIntervention({ error: errorMessage }, session) : null;
    return {
      success: false,
      error: errorMessage,
      requiresHumanIntervention: !!intervention,
      interventionReason: intervention?.error,
      interventionEvent: intervention?.interventionEvent,
      screenshots: intervention?.screenshots,
      artifacts: intervention?.artifacts,
      externalRecords: intervention?.externalRecords,
      executionTimeMs: Date.now() - startTime,
    };
  }
});

/**
 * Boss 获取简历执行器
 */
const bossResumeExecutor = withAudit(async (tool, params, context) => {
  const startTime = Date.now();
  const p = params as { sessionId: string; userId: string };

  try {
    const session = sessionManager.getSession(p.sessionId);
    if (!session || !session.isLoggedIn) {
      return {
        success: false,
        error: "会话不存在或未登录",
        executionTimeMs: Date.now() - startTime,
      };
    }

    const targetUrl = `${BOSS_CONFIG.resumeUrl}?uid=${encodeURIComponent(p.userId)}`;
    const pageResult = await browserWorker.navigate(session, targetUrl);
    if (!pageResult.success) {
      const intervention = detectIntervention(pageResult, session);
      return {
        ...pageResult,
        requiresHumanIntervention: !!intervention || pageResult.requiresHumanIntervention,
        interventionReason: intervention?.error ?? pageResult.error,
        interventionEvent: intervention?.interventionEvent ?? pageResult.interventionEvent,
        screenshots: intervention?.screenshots ?? pageResult.screenshots,
        artifacts: intervention?.artifacts ?? pageResult.artifacts,
        externalRecords: intervention?.externalRecords ?? pageResult.externalRecords,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const resume = buildResumeFromText(pageResult.text ?? "", p.userId);
    const recording = await browserWorker.captureRecording(session, "resume-session");

    return {
      success: true,
      data: resume,
      externalRecords: [...(pageResult.externalRecords ?? []), ...(recording.externalRecords ?? [])],
      artifacts: recording.artifacts,
      screenshots: pageResult.screenshots,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[Boss] 获取简历失败:", error);
    const message = error instanceof Error ? error.message : "获取简历失败";
    const session = sessionManager.getSession(p.sessionId);
    const intervention = session ? detectIntervention({ error: message }, session) : null;
    return {
      success: false,
      error: message,
      requiresHumanIntervention: !!intervention,
      interventionReason: intervention?.error,
      interventionEvent: intervention?.interventionEvent,
      screenshots: intervention?.screenshots,
      artifacts: intervention?.artifacts,
      externalRecords: intervention?.externalRecords,
      executionTimeMs: Date.now() - startTime,
    };
  }
});

// ─────────────────────────────────────────────────────────
// 注册 Tools
// ─────────────────────────────────────────────────────────

export function registerBossTools() {
  toolRegistry.register(bossLoginTool, bossLoginExecutor);
  toolRegistry.register(bossSearchTool, bossSearchExecutor);
  toolRegistry.register(bossGreetTool, bossGreetExecutor);
  toolRegistry.register(bossResumeTool, bossResumeExecutor);

  console.log("[Boss] 已注册 Boss 直聘 Tools:", [
    bossLoginTool.id,
    bossSearchTool.id,
    bossGreetTool.id,
    bossResumeTool.id,
  ]);
}

// 自动注册
if (typeof window === "undefined") {
  registerBossTools();
}
