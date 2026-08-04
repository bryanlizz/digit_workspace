// ─────────────────────────────────────────────────────────
// 数智企业 · Mock 知识库仓库
// ─────────────────────────────────────────────────────────

import type {
  KnowledgeDocDTO,
  CreateKnowledgeDocInput,
  KnowledgeFilter,
  KnowledgeSearchInput,
  KnowledgeSearchResult,
  KnowledgeStats,
} from "@lobster/types";
import type { IKnowledgeRepository } from "../types";
import { DEFAULT_TENANT_ID } from "../../data";

export class MockKnowledgeRepository implements IKnowledgeRepository {
  private docs: Map<string, KnowledgeDocDTO>;

  constructor() {
    this.docs = new Map();

    const sampleDocs: KnowledgeDocDTO[] = [
      {
        id: "doc-001",
        tenantId: DEFAULT_TENANT_ID,
        title: "2026 年新能源行业洞察报告",
        content: "新能源行业在 2026 年持续快速增长。光伏装机量预计达到 ... 储能市场呈现爆发态势 ...",
        permissionTags: ["L1", "L2"],
        departmentScope: ["ALL"],
        fileType: "pdf",
        fileSize: 2_400_000,
        metadata: { author: "市场分析部", version: "2.1" },
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
      {
        id: "doc-002",
        tenantId: DEFAULT_TENANT_ID,
        title: "合同审查标准流程 V3",
        content: "合同审查流程分为以下步骤：1. 收件登记 2. 初步审查 3. 风险评级 4. 条款修改建议 ...",
        permissionTags: ["L2", "L3"],
        departmentScope: ["财务法务与风控"],
        fileType: "docx",
        fileSize: 500_000,
        metadata: { author: "法务部", version: "3.0" },
        createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      },
      {
        id: "doc-003",
        tenantId: DEFAULT_TENANT_ID,
        title: "员工入职培训手册",
        content: "欢迎加入公司！本手册包含：公司文化、组织架构、IT 系统使用指南、常见问题 ...",
        permissionTags: ["L1"],
        departmentScope: ["ALL"],
        fileType: "pdf",
        fileSize: 3_200_000,
        metadata: { author: "人力资源部", version: "5.2" },
        createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      },
      {
        id: "doc-004",
        tenantId: DEFAULT_TENANT_ID,
        title: "2026Q2 财务分析报告",
        content: "第二季度营收同比增长 23%，毛利率 45%，主要增长驱动来自 ...",
        permissionTags: ["L3", "L4"],
        departmentScope: ["总裁办", "财务法务与风控"],
        fileType: "xlsx",
        fileSize: 1_800_000,
        metadata: { author: "财务部", version: "1.0" },
        createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 45).toISOString(),
      },
      {
        id: "doc-005",
        tenantId: DEFAULT_TENANT_ID,
        title: "竞品对标分析矩阵",
        content: "主要竞品包括：A 公司（市场份额 35%）、B 公司（28%）、C 公司（15%）...",
        permissionTags: ["L1", "L2"],
        departmentScope: ["ALL"],
        fileType: "csv",
        fileSize: 200_000,
        metadata: { author: "竞争情报部", version: "4.0" },
        createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
    ];

    sampleDocs.forEach((d) => this.docs.set(d.id, d));
  }

  async findById(id: string): Promise<KnowledgeDocDTO | null> {
    return this.docs.get(id) ?? null;
  }

  async findMany(filter?: KnowledgeFilter): Promise<KnowledgeDocDTO[]> {
    let result = Array.from(this.docs.values());
    if (filter) {
      if (filter.searchText) {
        const q = filter.searchText.toLowerCase();
        result = result.filter((d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
      }
      if (filter.department) {
        result = result.filter((d) => d.departmentScope.includes("ALL") || d.departmentScope.includes(filter.department!));
      }
    }
    return result;
  }

  async create(data: CreateKnowledgeDocInput): Promise<KnowledgeDocDTO> {
    const id = `doc-${crypto.randomUUID().slice(0, 6)}`;
    const doc: KnowledgeDocDTO = {
      id,
      tenantId: DEFAULT_TENANT_ID,
      title: data.title,
      content: data.content,
      permissionTags: data.permissionTags ?? ["L1"],
      departmentScope: data.departmentScope ?? ["ALL"],
      fileType: data.fileType ?? null,
      fileSize: data.fileSize ?? null,
      metadata: (data.metadata as Record<string, unknown>) ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.docs.set(id, doc);
    return doc;
  }

  async update(id: string, data: Partial<CreateKnowledgeDocInput>): Promise<KnowledgeDocDTO> {
    const existing = this.docs.get(id);
    if (!existing) throw new Error(`Document ${id} not found`);
    const updated: KnowledgeDocDTO = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    } as KnowledgeDocDTO;
    this.docs.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.docs.delete(id);
  }

  async count(filter?: KnowledgeFilter): Promise<number> {
    const result = await this.findMany(filter);
    return result.length;
  }

  async search(params: KnowledgeSearchInput): Promise<KnowledgeSearchResult[]> {
    const docs = Array.from(this.docs.values());

    // 权限过滤
    const filtered = docs.filter((d) => {
      const minLevel = Math.min(...d.permissionTags.map((t) => parseInt(t.replace("L", ""))));
      return params.userPermissionBm >= minLevel;
    });

    // 文本匹配
    const query = params.query.toLowerCase();
    const scored = filtered
      .map((d) => ({
        id: d.id,
        title: d.title,
        content: d.content.slice(0, 200),
        score: d.title.toLowerCase().includes(query) ? 0.9 : d.content.toLowerCase().includes(query) ? 0.6 : 0,
        permissionTags: d.permissionTags,
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, params.limit ?? 5);

    return scored;
  }

  async findByPermissionLevel(minLevel: number): Promise<KnowledgeDocDTO[]> {
    return Array.from(this.docs.values()).filter((d) => {
      const levels = d.permissionTags.map((t) => parseInt(t.replace("L", "")));
      return levels.some((l) => l <= minLevel);
    });
  }

  async getStats(tenantId: string): Promise<KnowledgeStats> {
    const tenantDocs = Array.from(this.docs.values()).filter((d) => d.tenantId === tenantId);
    const byFileType: Record<string, number> = {};
    const byPermissionLevel: Record<string, number> = {};

    tenantDocs.forEach((d) => {
      const ft = d.fileType ?? "unknown";
      byFileType[ft] = (byFileType[ft] ?? 0) + 1;
      const minLevel = Math.min(...d.permissionTags.map((t) => parseInt(t.replace("L", ""))));
      const key = `L${minLevel}`;
      byPermissionLevel[key] = (byPermissionLevel[key] ?? 0) + 1;
    });

    return {
      totalDocs: tenantDocs.length,
      totalSize: tenantDocs.reduce((sum, d) => sum + (d.fileSize ?? 0), 0),
      byFileType,
      byPermissionLevel,
    };
  }
}

/** Singleton */
export const knowledgeRepo = new MockKnowledgeRepository();
