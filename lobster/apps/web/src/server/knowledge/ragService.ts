import { knowledgeRepo } from "~/lib/repository";
import { aiGateway } from "~/server/gateway/aiGateway";
import { vectorService } from "./vectorService";

export interface RAGQueryParams {
  query: string;
  userPermissionBm: number;
  department?: string;
  limit?: number;
}

export interface RAGResult {
  id: string;
  title: string;
  content: string;
  score: number;
  source: string;
}

export interface RAGAnswer {
  answer: string;
  sources: RAGResult[];
}

export class RAGService {
  async search(params: RAGQueryParams): Promise<RAGResult[]> {
    // Try vector search first (if embeddings exist)
    try {
      const vectorResults = await vectorService.searchSimilar(
        params.query,
        // Using default tenant since RAGQueryParams doesn't have tenantId
        "tenant-default",
        params.limit ?? 5,
      );
      if (vectorResults.length > 0) {
        return vectorResults.map((r) => ({ ...r, source: r.title }));
      }
    } catch {
      // Fall back to keyword search
    }

    // Keyword search fallback
    const docs = await knowledgeRepo.search(params);

    return docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      score: doc.score,
      source: doc.title,
    }));
  }

  async answer(params: RAGQueryParams): Promise<RAGAnswer> {
    const sources = await this.search(params);
    if (sources.length === 0) {
      return { answer: "我没有找到相关的知识文档来回答这个问题。", sources: [] };
    }

    if (!aiGateway.canUseRealAI()) {
      return {
        answer: [
          `基于检索到的 ${sources.length} 篇相关文档，以下是我的回答：`,
          "",
          ...sources.map((s: any, i: number) => `${i + 1}. **${s.title}**（相关性: ${s.score}）`),
          "",
          "💡 提示：配置 AI 路由或中转站后可获得更精准的 AI 生成回答。",
        ].join("\n"),
        sources,
      };
    }

    try {
      const context = sources.map((s: any) => `[${s.title}]\n${s.content}`).join("\n\n");
      const result = await aiGateway.createCompletion({
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "你是一个企业知识库助手。基于提供的知识文档回答问题。如果文档不足以回答，请明确说明。用中文回答。引用时标注来源。" },
          { role: "user", content: `知识文档：\n${context}\n\n问题：${params.query}` },
        ],
        maxTokens: 1000,
      });
      return { answer: result.content, sources };
    } catch {
      return { answer: "AI 回答生成失败，请稍后重试。", sources };
    }
  }
}

export const ragService = new RAGService();
