import { db } from "~/server/db";
import { env } from "~/env";
import { graphExtractor } from "./graphExtractor";
import { vectorService } from "./vectorService";

const USE_MOCK = !env.OPENAI_API_KEY || env.OPENAI_API_KEY === "sk-your-key-here";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

/**
 * 知识库处理管道
 */
export class KnowledgePipeline {
  async processDocument(
    tenantId: string,
    title: string,
    content: string,
    options?: {
      permissionTags?: string[];
      departmentScope?: string[];
      fileType?: string;
      fileSize?: number;
    },
  ): Promise<{ id: string; chunks: number }> {
    const chunks = this.chunkDocument(content);

    const created = await db.$transaction(
      chunks.map((chunk, index) =>
        db.knowledgeDoc.create({
          data: {
            tenantId,
            title: `${title} (${index + 1}/${chunks.length})`,
            content: chunk,
            permissionTags: JSON.stringify(options?.permissionTags ?? ["L1"]),
            departmentScope: JSON.stringify(options?.departmentScope ?? ["ALL"]),
            fileType: options?.fileType ?? "txt",
            fileSize: options?.fileSize ?? content.length,
            metadata: { originalTitle: title, chunkIndex: index, totalChunks: chunks.length },
          },
        }),
      ),
    );

    try {
      await graphExtractor.extractFromTaskResult(tenantId, title, content);
    } catch {
      // 图谱抽取失败不影响文档入库
    }

    // 异步向量化（不阻塞入库）
    created.forEach((doc) => {
      void vectorService.embedDocument(doc.id, doc.content);
    });

    return { id: created[0]!.id, chunks: chunks.length };
  }

  chunkDocument(content: string): string[] {
    const paragraphs = content.split(/\n\s*\n/);
    const chunks: string[] = [];
    let current = "";

    for (const para of paragraphs) {
      if ((current + para).length <= CHUNK_SIZE) {
        current += (current ? "\n\n" : "") + para;
      } else {
        if (current) chunks.push(current);
        if (para.length > CHUNK_SIZE) {
          const sentences = para.split(/(?<=[。！？])/);
          let sc = "";
          for (const s of sentences) {
            if ((sc + s).length <= CHUNK_SIZE) { sc += s; } else { if (sc) chunks.push(sc); sc = s; }
          }
          current = sc;
        } else { current = para; }
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  async getStats(tenantId: string) {
    const docs = await db.knowledgeDoc.findMany({ where: { tenantId } });
    const byFileType: Record<string, number> = {};
    const byPermissionLevel: Record<string, number> = {};
    let totalSize = 0;

    docs.forEach((doc: any) => {
      const ft = doc.fileType ?? "unknown";
      byFileType[ft] = (byFileType[ft] ?? 0) + 1;
      totalSize += doc.fileSize ?? 0;
      const tags: string[] = JSON.parse(doc.permissionTags ?? "[]");
      const minLevel = Math.min(...tags.map((t: string) => parseInt(t.replace("L", ""))));
      const key = `L${minLevel}`;
      byPermissionLevel[key] = (byPermissionLevel[key] ?? 0) + 1;
    });

    return { totalDocs: docs.length, totalSize, byFileType, byPermissionLevel };
  }
}

export const knowledgePipeline = new KnowledgePipeline();
