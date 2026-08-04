// ─────────────────────────────────────────────────────────
// 数智企业 · Prisma 知识库仓库
// ─────────────────────────────────────────────────────────

import { db } from "~/server/db";
import type { Prisma } from "@lobster/db";
import type {
  KnowledgeDocDTO,
  CreateKnowledgeDocInput,
  KnowledgeFilter,
  KnowledgeSearchInput,
  KnowledgeSearchResult,
  KnowledgeStats,
} from "@lobster/types";
import type { IKnowledgeRepository } from "../types";
import { DEFAULT_TENANT_ID } from "~/lib/data";

const knowledgeSelect = {
  id: true,
  tenantId: true,
  title: true,
  content: true,
  permissionTags: true,
  departmentScope: true,
  fileType: true,
  fileSize: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

type KnowledgeWithFields = Prisma.KnowledgeDocGetPayload<{ select: typeof knowledgeSelect }>;
type KnowledgeDocRow = Awaited<ReturnType<typeof db.knowledgeDoc.findMany>>[number];
function parseStringArray(value: string | null | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : fallback;
  } catch {
    return fallback;
  }
}

function toInputJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toKnowledgeDocDTO(doc: KnowledgeWithFields): KnowledgeDocDTO {
  return {
    id: doc.id,
    tenantId: doc.tenantId,
    title: doc.title,
    content: doc.content,
    permissionTags: parseStringArray(doc.permissionTags, ["L1"]),
    departmentScope: parseStringArray(doc.departmentScope, ["ALL"]),
    fileType: doc.fileType ?? null,
    fileSize: doc.fileSize ?? null,
    metadata: (doc.metadata as Record<string, unknown> | null) ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function minPermissionLevel(tags: string[]): number {
  const levels = tags
    .map((tag) => Number.parseInt(tag.replace("L", ""), 10))
    .filter((level) => Number.isFinite(level));
  return levels.length > 0 ? Math.min(...levels) : 1;
}

function buildSearchWhere(searchText?: string, tenantId?: string): Prisma.KnowledgeDocWhereInput {
  return {
    ...(tenantId ?? DEFAULT_TENANT_ID ? { tenantId: tenantId ?? DEFAULT_TENANT_ID } : {}),
    ...(searchText
      ? {
          OR: [
            { title: { contains: searchText } },
            { content: { contains: searchText } },
          ],
        }
      : {}),
  };
}

export class PrismaKnowledgeRepository implements IKnowledgeRepository {
  async findById(id: string): Promise<KnowledgeDocDTO | null> {
    const doc = await db.knowledgeDoc.findUnique({
      where: { id },
      select: knowledgeSelect,
    });

    return doc ? toKnowledgeDocDTO(doc) : null;
  }

  async findMany(filter?: KnowledgeFilter): Promise<KnowledgeDocDTO[]> {
    const docs = await db.knowledgeDoc.findMany({
      where: {
        ...(filter?.tenantId ?? DEFAULT_TENANT_ID ? { tenantId: filter?.tenantId ?? DEFAULT_TENANT_ID } : {}),
        ...(filter?.department
          ? {
              OR: [
                { departmentScope: { contains: JSON.stringify([filter.department]) } },
                { departmentScope: { contains: JSON.stringify(["ALL"]) } },
              ],
            }
          : {}),
        ...(filter?.searchText ? buildSearchWhere(filter.searchText).OR ? buildSearchWhere(filter.searchText) : {} : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: knowledgeSelect,
    });

    return docs.map(toKnowledgeDocDTO);
  }

  async create(data: CreateKnowledgeDocInput): Promise<KnowledgeDocDTO> {
    const doc = await db.knowledgeDoc.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        title: data.title,
        content: data.content,
        permissionTags: JSON.stringify(data.permissionTags ?? ["L1"]),
        departmentScope: JSON.stringify(data.departmentScope ?? ["ALL"]),
        fileType: data.fileType ?? null,
        fileSize: data.fileSize ?? null,
        ...(data.metadata !== undefined ? { metadata: toInputJsonValue(data.metadata) } : {}),
      },
      select: knowledgeSelect,
    });

    return toKnowledgeDocDTO(doc);
  }

  async update(id: string, data: Partial<CreateKnowledgeDocInput>): Promise<KnowledgeDocDTO> {
    const doc = await db.knowledgeDoc.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.permissionTags !== undefined ? { permissionTags: JSON.stringify(data.permissionTags) } : {}),
        ...(data.departmentScope !== undefined ? { departmentScope: JSON.stringify(data.departmentScope) } : {}),
        ...(data.fileType !== undefined ? { fileType: data.fileType ?? null } : {}),
        ...(data.fileSize !== undefined ? { fileSize: data.fileSize ?? null } : {}),
        ...(data.metadata !== undefined ? { metadata: toInputJsonValue(data.metadata) } : {}),
      },
      select: knowledgeSelect,
    });

    return toKnowledgeDocDTO(doc);
  }

  async delete(id: string): Promise<void> {
    await db.knowledgeDoc.delete({ where: { id } });
  }

  async count(filter?: KnowledgeFilter): Promise<number> {
    const where: Prisma.KnowledgeDocWhereInput = {
      ...(filter?.tenantId ?? DEFAULT_TENANT_ID ? { tenantId: filter?.tenantId ?? DEFAULT_TENANT_ID } : {}),
      ...(filter?.department
        ? {
            OR: [
              { departmentScope: { contains: JSON.stringify([filter.department]) } },
              { departmentScope: { contains: JSON.stringify(["ALL"]) } },
            ],
          }
        : {}),
      ...(filter?.searchText ? buildSearchWhere(filter.searchText) : {}),
    };

    return db.knowledgeDoc.count({ where });
  }

  async search(params: KnowledgeSearchInput): Promise<KnowledgeSearchResult[]> {
    const docs = await db.knowledgeDoc.findMany({
      where: {
        ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      },
      select: knowledgeSelect,
      orderBy: { updatedAt: "desc" },
    });

    const query = params.query.toLowerCase();
    const results = docs
      .map((doc: KnowledgeDocRow) => {
        const dto = toKnowledgeDocDTO(doc);
        const minLevel = minPermissionLevel(dto.permissionTags);
        if (params.userPermissionBm < minLevel) return null;
        if (params.department && params.department !== "ALL") {
          const allowed = dto.departmentScope.includes("ALL") || dto.departmentScope.includes(params.department);
          if (!allowed) return null;
        }

        const titleScore = dto.title.toLowerCase().includes(query) ? 0.9 : 0;
        const contentScore = dto.content.toLowerCase().includes(query) ? 0.6 : 0;
        const score = titleScore || contentScore;
        if (score <= 0) return null;

        return {
          id: dto.id,
          title: dto.title,
          content: dto.content.slice(0, 200),
          score,
          permissionTags: dto.permissionTags,
        } satisfies KnowledgeSearchResult;
      })
      .filter((item: KnowledgeSearchResult | null): item is KnowledgeSearchResult => item !== null)
      .sort((a: KnowledgeSearchResult, b: KnowledgeSearchResult) => b.score - a.score)
      .slice(0, params.limit ?? 5);

    return results;
  }

  async findByPermissionLevel(minLevel: number): Promise<KnowledgeDocDTO[]> {
    const docs = await db.knowledgeDoc.findMany({
      select: knowledgeSelect,
    });

    return docs
      .map((doc: KnowledgeDocRow) => toKnowledgeDocDTO(doc))
      .filter((doc: KnowledgeDocDTO) => minPermissionLevel(doc.permissionTags) <= minLevel);
  }

  async getStats(tenantId: string): Promise<KnowledgeStats> {
    const docs = await db.knowledgeDoc.findMany({
      where: { tenantId },
      select: knowledgeSelect,
    });

    const byFileType: Record<string, number> = {};
    const byPermissionLevel: Record<string, number> = {};
    let totalSize = 0;

    for (const doc of docs) {
      const dto = toKnowledgeDocDTO(doc);
      const fileType = dto.fileType ?? "unknown";
      byFileType[fileType] = (byFileType[fileType] ?? 0) + 1;
      totalSize += dto.fileSize ?? 0;
      const key = `L${minPermissionLevel(dto.permissionTags)}`;
      byPermissionLevel[key] = (byPermissionLevel[key] ?? 0) + 1;
    }

    return {
      totalDocs: docs.length,
      totalSize,
      byFileType,
      byPermissionLevel,
    };
  }
}

export const knowledgeRepo = new PrismaKnowledgeRepository();
