// ─────────────────────────────────────────────────────────
// 数智企业 · 向量服务
// SQLite JSON 存储 + 内存余弦相似度检索
// ─────────────────────────────────────────────────────────

import { db } from "~/server/db";
import { aiGateway } from "~/server/gateway/aiGateway";

const EMBEDDING_DIM = 1536; // text-embedding-3-small

/** 余弦相似度 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10);
}

export class VectorService {
  /**
   * 为文档生成并存储向量
   */
  async embedDocument(docId: string, content: string): Promise<number[] | null> {
    try {
      const embedding = await aiGateway.createEmbedding(content.slice(0, 8000));
      if (!embedding) return null;

      await db.knowledgeDoc.update({
        where: { id: docId },
        data: {
          metadata: {
            embedding,
            embeddedAt: new Date().toISOString(),
            embeddingModel: "text-embedding-3-small",
          },
        },
      });

      return embedding;
    } catch (error) {
      console.error(`[VectorService] Embed failed for doc ${docId}:`, error);
      return null;
    }
  }

  /**
   * 批量向量化所有未嵌入的文档
   */
  async embedAllPending(tenantId?: string): Promise<number> {
    const docs = await db.knowledgeDoc.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        // Filter in application layer — Prisma JSON path filter API varies by version
      },
      select: { id: true, title: true, content: true, metadata: true },
      take: 100,
    });

    // Filter in application layer for docs without embeddings
    const pending = docs.filter((d) => {
      const meta = d.metadata as Record<string, unknown> | null;
      return !meta?.embedding;
    });

    let count = 0;
    for (const doc of pending) {
      const ok = await this.embedDocument(doc.id, doc.content);
      if (ok) count++;
    }
    return count;
  }

  /**
   * 向量相似度检索
   */
  async searchSimilar(
    query: string,
    tenantId: string,
    topK = 5,
  ): Promise<Array<{ id: string; title: string; content: string; score: number }>> {
    // Generate query embedding
    const queryEmbedding = await aiGateway.createEmbedding(query);
    if (!queryEmbedding) return [];

    // Load all embedded docs for this tenant
    const docs = await db.knowledgeDoc.findMany({
      where: { tenantId },
      select: { id: true, title: true, content: true, metadata: true },
      take: 500,
    });

    // Filter to only docs with embeddings
    const withEmbeddings = docs
      .map((d) => {
        const meta = d.metadata as Record<string, unknown> | null;
        const emb = meta?.embedding as number[] | undefined;
        return emb ? { id: d.id, title: d.title, content: d.content, embedding: emb } : null;
      })
      .filter((d): d is { id: string; title: string; content: string; embedding: number[] } => d !== null);

    // Compute similarities and rank
    const ranked = withEmbeddings
      .map((d) => ({ id: d.id, title: d.title, content: d.content, score: cosineSimilarity(queryEmbedding, d.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return ranked;
  }

  /**
   * 检查是否有可用的向量检索
   */
  async hasEmbeddings(tenantId: string): Promise<boolean> {
    const count = await db.knowledgeDoc.count({
      where: { tenantId },
    });
    // Check if any docs have embeddings in metadata JSON
    // For now, assume yes if there are docs with metadata
    return count > 0;
  }
}

export const vectorService = new VectorService();
