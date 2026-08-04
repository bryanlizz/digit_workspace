import type { AgentDTO, AgentCoreMemoryDTO } from "@lobster/types";
import { PRESET_EMPLOYEES } from "./preset-employees";

/**
 * 默认的 Agent 实例数据
 * 每个预设员工对应一个默认 Agent，归属默认老板
 */
export const DEFAULT_AGENTS: Array<{
  id: string;
  name: string;
  ownerId: string;
  presetRoleId: string;
  skillTags: string[];
  permissionBm: number;
  status: "IDLE" | "WORKING" | "BLOCKED" | "AWAITING_APPROVAL" | "DONE";
  coreMemory: {
    roleDefinition: {
      title: string;
      skills: string[];
      personality: string;
      boundaries: string;
    };
    experienceSummary: string;
    totalTasksCompleted: number;
    successRate: number;
  };
}> = PRESET_EMPLOYEES.map((emp, index) => ({
  id: `agent-${emp.id}`,
  name: emp.name,
  ownerId: "admin-boss", // 默认老板 ID
  presetRoleId: emp.id,
  skillTags: emp.skills,
  permissionBm: emp.defaultPermission,
  status: (index % 5 === 0 ? "WORKING" :
           index % 7 === 0 ? "AWAITING_APPROVAL" :
           index % 11 === 0 ? "DONE" :
           index % 13 === 0 ? "BLOCKED" :
           "IDLE") as "IDLE" | "WORKING" | "BLOCKED" | "AWAITING_APPROVAL" | "DONE",
  coreMemory: {
    roleDefinition: {
      title: emp.title,
      skills: emp.skills,
      personality: getPersonality(emp.department),
      boundaries: getBoundaries(emp.riskLevel),
    },
    experienceSummary: `已完成 ${getRandomTaskCount(emp.riskLevel)} 项${emp.department}相关任务，平均采纳率 ${getRandomAdoptionRate()}%。`,
    totalTasksCompleted: getRandomTaskCount(emp.riskLevel),
    successRate: getRandomAdoptionRate() / 100,
  },
}));

/** 根据职能域生成性格描述 */
function getPersonality(department: string): string {
  const map: Record<string, string> = {
    "战略与顶层设计": "全局视角，数据驱动，偏好长期主义决策。",
    "行业与研究洞察": "严谨客观，注重数据来源，反对主观臆断。",
    "产品与研发管理": "结果导向，注重交付质量，善于拆解复杂问题。",
    "销售增长与商业化": "客户至上，结果驱动，善于发现商业机会。",
    "市场品牌与传播": "创意驱动，注重品牌一致性，善于讲故事。",
    "客户成功与服务": "服务意识强，耐心细致，善于沟通引导。",
    "增长运营与投放": "实验思维，数据敏感，追求可量化的增长。",
    "人才组织与文化": "公正公平，注重隐私，善于发现人才。",
    "财务法务与风控": "保守审慎，注重合规，对风险高度敏感。",
    "行政后勤与支持": "高效务实，注重细节，善于资源协调。",
  };
  return map[department] ?? "专业可靠，注重协作。";
}

/** 根据风险等级生成边界规则 */
function getBoundaries(riskLevel: "LOW" | "MEDIUM" | "HIGH"): string {
  const boundaries: Record<string, string> = {
    LOW: "仅限读取公开数据，不得修改任何业务数据。所有输出需标注数据来源。",
    MEDIUM: "可在授权范围内修改数据，涉及外发操作需上级审批。定期自查输出质量。",
    HIGH: "所有写入操作均需审批确认。不得对外发送任何数据。敏感操作需双人确认。",
  };
  return boundaries[riskLevel] ?? boundaries["LOW"]!;
}

/** 根据风险等级生成模拟任务数 */
function getRandomTaskCount(riskLevel: string): number {
  const base = riskLevel === "HIGH" ? 8 : riskLevel === "MEDIUM" ? 12 : 20;
  return base + Math.floor(Math.random() * 10);
}

/** 生成模拟采纳率 */
function getRandomAdoptionRate(): number {
  return 75 + Math.floor(Math.random() * 20);
}
