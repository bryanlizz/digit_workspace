// ─────────────────────────────────────────────────────────
// 数智企业 · 知识库类型定义
// ─────────────────────────────────────────────────────────

/**
 * 知识库文档 DTO
 */
export interface KnowledgeDocDTO {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  permissionTags: string[];
  departmentScope: string[];
  fileType: string | null;
  fileSize: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建知识库文档的输入参数
 */
export interface CreateKnowledgeDocInput {
  title: string;
  content: string;
  permissionTags?: string[];
  departmentScope?: string[];
  fileType?: string;
  fileSize?: number;
  metadata?: Record<string, unknown>;
}

/**
 * 知识库筛选参数
 */
export interface KnowledgeFilter {
  permissionLevel?: number;
  department?: string;
  tenantId?: string;
  searchText?: string;
}

/**
 * 知识检索输入
 */
export interface KnowledgeSearchInput {
  query: string;
  userPermissionBm: number;
  department?: string;
  tenantId?: string;
  limit?: number;
}

/**
 * 知识检索结果
 */
export interface KnowledgeSearchResult {
  id: string;
  title: string;
  content: string;
  score: number;
  permissionTags: string[];
}

/**
 * 知识库统计
 */
export interface KnowledgeStats {
  totalDocs: number;
  totalSize: number;
  byFileType: Record<string, number>;
  byPermissionLevel: Record<string, number>;
}
