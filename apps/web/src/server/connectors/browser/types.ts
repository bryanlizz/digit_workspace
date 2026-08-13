// ─────────────────────────────────────────────────────────
// 浏览器自动化类型定义
// ─────────────────────────────────────────────────────────

/**
 * 浏览器会话状态
 */
export interface BrowserSession {
  id: string;
  /** 会话标签（如 "boss_main", "boss_backup"） */
  label: string;
  /** 租户 ID */
  tenantId: string;
  /** 代理配置 */
  proxy?: ProxyConfig;
  /** 创建时间 */
  createdAt: Date;
  /** 最后活跃时间 */
  lastActiveAt: Date;
  /** 是否已登录 */
  isLoggedIn: boolean;
  /** 用户信息（登录后） */
  userInfo?: BossUserInfo;
  /** 当前页面地址 */
  currentUrl?: string;
  /** 已绑定的登录态凭证 */
  cookieCredentialId?: string;
  /** 最近一次截图名称 */
  lastScreenshot?: string;
  /** 最近一次录屏名称 */
  lastRecording?: string;
}

/**
 * 代理配置
 */
export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol?: "http" | "socks5";
}

/**
 * Boss 用户信息
 */
export interface BossUserInfo {
  userId: string;
  userName: string;
  companyId: string;
  companyName: string;
  avatar?: string;
}

/**
 * 搜索候选人参数
 */
export interface BossSearchParams {
  /** 职位关键词 */
  keyword?: string;
  /** 工作地区 */
  city?: string;
  /** 工作年限 */
  workYear?: string;
  /** 学历要求 */
  degree?: string;
  /** 薪资范围 */
  salary?: string;
  /** 融资阶段 */
  financeStage?: string;
  /** 公司规模 */
  companySize?: string;
  /** 行业分类 */
  industry?: string;
  /** 搜索页码 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
}

/**
 * 候选人信息
 */
export interface BossCandidate {
  /** Boss 用户 ID */
  userId: string;
  /** 姓名 */
  name: string;
  /** 头像 URL */
  avatar?: string;
  /** 当前职位 */
  title?: string;
  /** 所在公司 */
  company?: string;
  /** 工作年限 */
  workYear?: string;
  /** 学历 */
  degree?: string;
  /** 最近活跃时间 */
  activeTime?: string;
  /** 期望职位 */
  expectPosition?: string;
  /** 期望薪资 */
  expectSalary?: string;
  /** 个人标签 */
  tags?: string[];
  /** 聊天消息 */
  chatMessage?: string;
}

/**
 * 打招呼参数
 */
export interface BossGreetParams {
  /** 候选人用户 ID */
  userId: string;
  /** 招呼语内容 */
  message?: string;
  /** 快速沟通话术 ID */
  quickChatId?: string;
}

/**
 * 打招呼结果
 */
export interface BossGreetResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 简历信息
 */
export interface BossResume {
  /** 姓名 */
  name: string;
  /** 性别 */
  gender?: string;
  /** 年龄 */
  age?: string;
  /** 学历 */
  degree?: string;
  /** 毕业院校 */
  school?: string;
  /** 工作年限 */
  workYear?: string;
  /** 当前职位 */
  title?: string;
  /** 当前公司 */
  company?: string;
  /** 工作经历 */
  workExperience: Array<{
    company: string;
    title: string;
    duration: string;
    description?: string;
  }>;
  /** 项目经历 */
  projects?: Array<{
    name: string;
    role: string;
    duration: string;
    description?: string;
  }>;
  /** 教育背景 */
  education?: Array<{
    school: string;
    degree: string;
    duration: string;
  }>;
  /** 技能特长 */
  skills?: string[];
}

/**
 * 人类接管事件
 */
export interface HumanInterventionEvent {
  type: "captcha" | "verify_code" | "login_expired" | "risk_alert" | "page_change" | "manual_required";
  message: string;
  screenshot?: string;
  /** 需要返回的数据 */
  requiredAction?: string;
  /** 挂起的任务 ID */
  taskId: string;
  /** Agent ID */
  agentId: string;
}

/**
 * 操作结果基类
 */
export interface BrowserOperationResult {
  success: boolean;
  error?: string;
  screenshot?: string;
  requiresHumanIntervention?: boolean;
  interventionEvent?: HumanInterventionEvent;
}

/**
 * 搜索结果
 */
export interface BossSearchResult extends BrowserOperationResult {
  candidates: BossCandidate[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
