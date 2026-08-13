import { db } from "~/server/db";
import { aiGateway } from "~/server/gateway/aiGateway";

export class GraphExtractor {
  async extractFromTaskResult(tenantId: string, taskTitle: string, taskResult: string): Promise<void> {
    let extraction: { entities: Array<{ name: string; type: string; properties?: Record<string, unknown> }>; relations: Array<{ source: string; target: string; type: string }> };

    try {
      const result = await aiGateway.createCompletion({
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `从以下内容中抽取实体和关系，输出 JSON。\n\n内容：${taskResult.slice(0, 2000)}\n\n{"entities":[{"name":"","type":"","properties":{}}],"relations":[{"source":"","target":"","type":""}]}` }],
        responseFormat: { type: "json_object" },
        maxTokens: 1000,
      });
      extraction = JSON.parse(result.content);
    } catch {
      extraction = { entities: [], relations: [] };
    }

    for (const entity of extraction.entities) {
      try {
        const props = entity.properties ?? ({} as any);
        await db.graphEntity.upsert({
          where: { tenantId_name_type: { tenantId, name: entity.name, type: entity.type } },
          update: { properties: props },
          create: { tenantId, name: entity.name, type: entity.type, properties: props },
        });
      } catch {}
    }

    for (const rel of extraction.relations) {
      try {
        const source = await db.graphEntity.findFirst({ where: { tenantId, name: rel.source } });
        const target = await db.graphEntity.findFirst({ where: { tenantId, name: rel.target } });
        if (source && target) {
          await db.graphRelation.create({ data: { tenantId, sourceId: source.id, targetId: target.id, type: rel.type } });
        }
      } catch {}
    }
  }

  async getVisualizationData(tenantId: string, options?: { entityType?: string; maxNodes?: number }) {
    const entities = await db.graphEntity.findMany({
      where: { tenantId, ...(options?.entityType ? { type: options.entityType } : {}) },
      take: options?.maxNodes ?? 50,
      orderBy: { createdAt: "desc" },
    });

    const entityIds = entities.map((e: any) => e.id);
    const relations = await db.graphRelation.findMany({
      where: { tenantId, OR: [{ sourceId: { in: entityIds } }, { targetId: { in: entityIds } }] },
    });

    const edgeCount = new Map<string, number>();
    for (const r of relations) {
      edgeCount.set(r.sourceId, (edgeCount.get(r.sourceId) ?? 0) + 1);
      edgeCount.set(r.targetId, (edgeCount.get(r.targetId) ?? 0) + 1);
    }

    return {
      nodes: entities.map((e: any) => ({
        id: e.id,
        label: e.name,
        type: e.type,
        size: Math.max(5, Math.min(30, (edgeCount.get(e.id) ?? 1) * 5)),
      })),
      edges: relations.map((r: any) => ({ source: r.sourceId, target: r.targetId, label: r.type })),
    };
  }
}

export const graphExtractor = new GraphExtractor();
