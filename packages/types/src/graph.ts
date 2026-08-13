// ─────────────────────────────────────────────────────────
// 数智企业 · 知识图谱类型定义
// ─────────────────────────────────────────────────────────

/**
 * 图谱实体 DTO
 */
export interface GraphEntityDTO {
  id: string;
  tenantId: string;
  type: string;
  name: string;
  properties: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * 图谱关系 DTO
 */
export interface GraphRelationDTO {
  id: string;
  tenantId: string;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  targetId: string;
  targetName: string;
  targetType: string;
  type: string;
  properties: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * 图查询输入
 */
export interface GraphQuery {
  /** 起点实体名称 */
  startEntityName: string;
  /** 起点实体类型 */
  startEntityType?: string;
  /** 遍历深度 */
  depth?: number;
  /** 关系类型过滤 */
  relationTypes?: string[];
}

/**
 * 路径查询结果
 */
export interface GraphPath {
  nodes: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  edges: Array<{
    sourceId: string;
    targetId: string;
    type: string;
  }>;
}

/**
 * 实体关系图（前端可视化用）
 */
export interface GraphVisualizationData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    /** 节点大小（按关联数） */
    size: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label: string;
  }>;
}
