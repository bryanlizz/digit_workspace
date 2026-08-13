import type { PresetEmployee } from "@lobster/types";

/**
 * 15 个预设数字员工数据
 * 覆盖 8 大职能域，开箱即用
 */
export const PRESET_EMPLOYEES: PresetEmployee[] = [
  // ─── 战略与顶层设计 ─────────────────────────────────
  {
    id: "strategist",
    name: "战略规划师",
    department: "战略与顶层设计",
    title: "首席战略顾问",
    skills: ["战略解码", "增长飞轮", "商业模型", "SWOT分析"],
    riskLevel: "LOW",
    defaultPermission: 1, // L1 只读
    description: "帮助企业制定长期战略规划，解码业务增长飞轮。",
    avatar: "/avatars/strategist.png",
    color: "#4A90D9",
    officeZone: "strategy",
  },
  {
    id: "ceo-assistant",
    name: "CEO助理",
    department: "战略与顶层设计",
    title: "高级执行助理",
    skills: ["会议纪要", "日程管理", "决策追踪", "任务督办"],
    riskLevel: "MEDIUM",
    defaultPermission: 3, // L1 + L2
    description: "协助CEO管理日程、追踪决策执行、整理会议纪要。",
    avatar: "/avatars/ceo-assistant.png",
    color: "#5B9FE8",
    officeZone: "strategy",
  },

  // ─── 行业与研究洞察 ─────────────────────────────────
  {
    id: "market-analyst",
    name: "市场分析师",
    department: "行业与研究洞察",
    title: "高级市场分析师",
    skills: ["TAM/SAM测算", "RFM分析", "市场调研", "数据可视化"],
    riskLevel: "LOW",
    defaultPermission: 1,
    description: "深度分析市场数据，测算市场规模，发现增长机会。",
    avatar: "/avatars/market-analyst.png",
    color: "#7CB342",
    officeZone: "research",
  },
  {
    id: "competitive-intel",
    name: "竞争情报官",
    department: "行业与研究洞察",
    title: "竞争情报专家",
    skills: ["竞品追踪", "趋势扫描", "SWOT分析", "波特五力"],
    riskLevel: "LOW",
    defaultPermission: 1,
    description: "持续追踪竞品动态，扫描行业趋势，输出竞争策略。",
    avatar: "/avatars/competitive-intel.png",
    color: "#8BC34A",
    officeZone: "research",
  },

  // ─── 产品与研发管理 ─────────────────────────────────
  {
    id: "product-manager",
    name: "产品需求与规划",
    department: "产品与研发管理",
    title: "产品总监",
    skills: ["PRD编写", "优先级排序", "路线图规划", "用户调研"],
    riskLevel: "LOW",
    defaultPermission: 3, // L1 + L2
    description: "编写产品需求文档，规划产品路线图，管理需求优先级。",
    avatar: "/avatars/product-manager.png",
    color: "#FF7043",
    officeZone: "product",
  },
  {
    id: "ai-architect",
    name: "AI应用架构师",
    department: "产品与研发管理",
    title: "AI架构师",
    skills: ["RAG选型", "Agent编排", "MCP设计", "Prompt工程"],
    riskLevel: "MEDIUM",
    defaultPermission: 7, // L1 + L2 + L3
    description: "设计AI应用架构，选型RAG方案，编排Agent协作流程。",
    avatar: "/avatars/ai-architect.png",
    color: "#FF5722",
    officeZone: "product",
  },
  {
    id: "developer",
    name: "技术开发",
    department: "产品与研发管理",
    title: "全栈开发工程师",
    skills: ["编码", "接口对接", "代码评审", "技术方案设计"],
    riskLevel: "MEDIUM",
    defaultPermission: 7, // L1 + L2 + L3
    description: "编写代码、对接接口、参与代码评审，交付高质量软件。",
    avatar: "/avatars/developer.png",
    color: "#E64A19",
    officeZone: "product",
  },

  // ─── 销售增长与商业化 ───────────────────────────────
  {
    id: "ka-manager",
    name: "KA大客户经理",
    department: "销售增长与商业化",
    title: "大客户总监",
    skills: ["商务谈判", "续约管理", "定制方案", "客户关系"],
    riskLevel: "MEDIUM",
    defaultPermission: 3, // L1 + L2
    description: "管理关键客户关系，推动续约和增购，定制解决方案。",
    avatar: "/avatars/ka-manager.png",
    color: "#FDD835",
    officeZone: "sales",
  },

  // ─── 市场品牌与传播 ─────────────────────────────────
  {
    id: "brand-manager",
    name: "品牌内容与传播",
    department: "市场品牌与传播",
    title: "品牌总监",
    skills: ["品牌定位", "VI审核", "传播追踪", "内容策略"],
    riskLevel: "LOW",
    defaultPermission: 3, // L1 + L2
    description: "构建品牌体系，审核视觉输出，追踪传播效果。",
    avatar: "/avatars/brand-manager.png",
    color: "#AB47BC",
    officeZone: "marketing",
  },

  // ─── 客户成功与服务 ─────────────────────────────────
  {
    id: "training-advisor",
    name: "培训与赋能顾问",
    department: "客户成功与服务",
    title: "客户赋能专家",
    skills: ["Onboarding培训", "最佳实践", "客户赋能", "使用分析"],
    riskLevel: "LOW",
    defaultPermission: 3, // L1 + L2
    description: "为客户提供 onboarding 培训，分享最佳实践。",
    avatar: "/avatars/training-advisor.png",
    color: "#26A69A",
    officeZone: "customer-success",
  },

  // ─── 增长运营与投放 ─────────────────────────────────
  {
    id: "growth-manager",
    name: "增长内容中台",
    department: "增长运营与投放",
    title: "增长运营总监",
    skills: ["SEO", "社媒矩阵", "内容资产", "增长实验"],
    riskLevel: "LOW",
    defaultPermission: 3, // L1 + L2
    description: "运营社交媒体矩阵，优化SEO，管理内容资产。",
    avatar: "/avatars/growth-manager.png",
    color: "#42A5F5",
    officeZone: "growth",
  },

  // ─── 人才组织与文化 ─────────────────────────────────
  {
    id: "hr-manager",
    name: "HR与招聘管理",
    department: "人才组织与文化",
    title: "人力资源总监",
    skills: ["简历筛选", "面试安排", "Offer管理", "员工关系"],
    riskLevel: "MEDIUM",
    defaultPermission: 3, // L1 + L2
    description: "筛选简历、安排面试、管理招聘流程，处理员工关系。",
    avatar: "/avatars/hr-manager.png",
    color: "#EF5350",
    officeZone: "hr",
  },

  // ─── 财务法务与风控 ─────────────────────────────────
  {
    id: "financial-analyst",
    name: "财务分析与预算",
    department: "财务法务与风控",
    title: "财务总监",
    skills: ["预算编制", "现金流预测", "财务分析", "成本控制"],
    riskLevel: "HIGH",
    defaultPermission: 15, // L1+L2+L3+L4
    description: "编制企业预算，预测现金流，进行财务分析。",
    avatar: "/avatars/financial-analyst.png",
    color: "#1E88E5",
    officeZone: "finance",
  },
  {
    id: "legal-counsel",
    name: "法务合同与风控",
    department: "财务法务与风控",
    title: "首席法务官",
    skills: ["合同审查", "合规评估", "风险控制", "知识产权"],
    riskLevel: "HIGH",
    defaultPermission: 15, // L1+L2+L3+L4
    description: "审查合同条款，评估合规风险，控制法律风险。",
    avatar: "/avatars/legal-counsel.png",
    color: "#1565C0",
    officeZone: "finance",
  },

  // ─── 行政后勤与支持 ─────────────────────────────────
  {
    id: "admin-manager",
    name: "行政后勤管理",
    department: "行政后勤与支持",
    title: "行政总监",
    skills: ["差旅安排", "固定资产", "办公采购", "后勤保障"],
    riskLevel: "LOW",
    defaultPermission: 3, // L1 + L2
    description: "安排差旅行程，管理固定资产，保障后勤运转。",
    avatar: "/avatars/admin-manager.png",
    color: "#78909C",
    officeZone: "admin",
  },
];
