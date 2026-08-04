import type { PresetEmployee } from "@lobster/types";
import { PRESET_EMPLOYEES } from "~/lib/data/preset-employees";

/** 模拟员工市场数据 */
export const MARKET_EMPLOYEES = PRESET_EMPLOYEES.map((emp, i) => ({
  ...emp,
  priceTiers: [
    { tier: "基础", price: 199, features: ["基础技能", "日活8小时"] },
    { tier: "专业", price: 999, features: ["全部技能", "全天候在线", "优先响应"] },
    { tier: "企业", price: 1999, features: ["全部技能", "私有化部署", "专属定制"] },
  ],
  maturity: (i % 5) + 1,
  totalInstalls: Math.floor(Math.random() * 1000) + 100,
  rating: (3.5 + Math.random() * 1.5).toFixed(1),
}));

/** 模拟技能市场数据 */
export const MARKET_SKILLS = [
  { name: "战略解码", icon: "🎯", category: "分析", risk: "低", price: 99, compatible: ["战略规划师"], description: "帮助企业梳理战略目标，解码增长路径" },
  { name: "竞品追踪", icon: "🔍", category: "分析", risk: "低", price: 99, compatible: ["竞争情报官"], description: "自动追踪竞品动态，生成对比报告" },
  { name: "PRD 编写", icon: "📝", category: "创作", risk: "低", price: 199, compatible: ["产品需求与规划"], description: "根据需求自动生成标准 PRD 文档" },
  { name: "合同审查", icon: "⚖️", category: "法务", risk: "高", price: 499, compatible: ["法务合同与风控"], description: "智能审查合同条款，识别合规风险" },
  { name: "预算编制", icon: "📊", category: "财务", risk: "高", price: 399, compatible: ["财务分析与预算"], description: "自动编制部门预算，追踪执行情况" },
  { name: "会议纪要", icon: "📋", category: "助手", risk: "低", price: 99, compatible: ["CEO助理"], description: "实时记录会议内容，自动生成纪要" },
  { name: "简历筛选", icon: "📇", category: "HR", risk: "中", price: 199, compatible: ["HR与招聘管理"], description: "智能筛选简历，匹配岗位要求" },
  { name: "社交矩阵", icon: "📱", category: "运营", risk: "低", price: 199, compatible: ["增长内容中台"], description: "多平台内容分发，数据分析" },
  { name: "品牌定位", icon: "🏷️", category: "品牌", risk: "低", price: 199, compatible: ["品牌内容与传播"], description: "品牌策略分析，VI 一致性审查" },
  { name: "代码评审", icon: "💻", category: "开发", risk: "中", price: 299, compatible: ["技术开发"], description: "自动化代码审查，发现潜在缺陷" },
  { name: "商务谈判", icon: "🤝", category: "销售", risk: "中", price: 299, compatible: ["KA大客户经理"], description: "谈判策略建议，话术优化" },
  { name: "现金流预测", icon: "💰", category: "财务", risk: "高", price: 399, compatible: ["财务分析与预算"], description: "基于历史数据预测未来现金流" },
];
