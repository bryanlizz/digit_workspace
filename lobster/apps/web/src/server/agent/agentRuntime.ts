import { executeWithRetry, type AgentExecuteResult } from "./aiExecutor";
import { agentRepo, taskRepo, auditRepo } from "~/lib/repository";
import { DEFAULT_TENANT_ID } from "~/lib/data";
import { graphExtractor } from "~/server/knowledge/graphExtractor";

/**
 * Agent 运行时
 * 管理 Agent 的生命周期：接收任务 → 构建上下文 → 执行 → 记录记忆 → 输出结果
 */
export class AgentRuntime {
  async runTask(taskId: string): Promise<AgentExecuteResult> {
    const task = await taskRepo.findById(taskId);
    if (!task) throw new Error(`任务 ${taskId} 不存在`);
    const agentId = task.assignee?.id;
    if (!agentId) throw new Error(`任务 ${taskId} 未分配执行 Agent`);

    const projectId = task.project?.id ?? null;

    // 1. 检索相关记忆
    const memories = await agentRepo.findRelatedMemories(agentId, task.description ?? "", 3, { projectId });

    // 2. 执行任务
    const result = await executeWithRetry({
      agentId,
      taskTitle: task.title,
      taskDescription: task.description ?? "",
      projectContext: task.project?.name ?? "",
      pastMemories: memories.map((m) => `[${m.type}] ${m.summary}`),
      knowledgeContext: "",
    });

    // 3. 记录记忆
    if (result.content) {
      await agentRepo.addMemory(agentId, {
        type: result.success ? "success" : "failure",
        summary: `完成任务「${task.title}」：${result.content.slice(0, 100)}...`,
        importance: result.success ? 3 : 4,
        projectId,
        source: result.success ? "auto" : "suggested",
        metadata: { taskId, tokensUsed: result.tokensUsed, model: result.model, projectId },
      });
    }

    // 4. 审计
    await auditRepo.log({
      tenantId: DEFAULT_TENANT_ID,
      agentId,
      action: result.success ? "AI_EXECUTED" : "AI_EXECUTION_FAILED",
      permissionLevel: task.permissionLevel,
      detail: {
        taskId,
        taskTitle: task.title,
        taskStatusBefore: task.status,
        taskStatusAfter: result.success ? "DONE" : "REJECTED",
        projectId: task.project?.id ?? null,
        projectName: task.project?.name ?? null,
        model: result.model,
        tokens: result.tokensUsed,
        timeMs: result.executionTimeMs,
        keyId: result.keyId,
        memoriesUsed: memories.length,
        resultPreview: result.content?.slice(0, 240) ?? null,
      },
    });

    // 5. 更新任务状态（通过 Repository 接口）
    await taskRepo.update(taskId, {
      status: result.success ? "DONE" : "REJECTED",
      result: result.content?.slice(0, 1000) ?? null,
      completedAt: new Date().toISOString(),
    });

    if (result.success && result.content) {
      try {
        await graphExtractor.extractFromTaskResult(task.tenantId, task.title, result.content);
      } catch (error) {
        console.warn(`[AgentRuntime] 图谱抽取失败: ${taskId}`, error);
      }
    }

    return result;
  }
}

export const agentRuntime = new AgentRuntime();
