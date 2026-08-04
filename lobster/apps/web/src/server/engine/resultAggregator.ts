// ─────────────────────────────────────────────────────────
// 结果聚合器
// 汇总子任务结果生成最终报告
// ─────────────────────────────────────────────────────────

import type {
  SubTask,
  TaskContext,
  TaskExecutionResult,
  SubTaskResult,
  ExecutionError,
  Artifact,
  ExternalRecord,
} from "./types";
import type { ToolCallResult } from "~/server/tools/types";

/**
 * 结果聚合器
 */
export class ResultAggregator {
  /**
   * 汇总子任务结果生成最终报告
   */
  async aggregate(
    subTasks: SubTask[],
    results: Map<string, ToolCallResult>,
    context: TaskContext
  ): Promise<TaskExecutionResult> {
    const startTime = Date.now();

    // 转换子任务结果
    const subTaskResults = this.buildSubTaskResults(subTasks, results);

    // 提取产物
    const artifacts = this.extractArtifacts(results);

    // 提取外部记录
    const externalRecords = this.extractExternalRecords(results);

    // 提取错误
    const errors = this.extractErrors(subTaskResults);

    // 生成摘要
    const summary = await this.generateSummary(subTaskResults, context);

    // 建议后续动作
    const nextActions = await this.suggestNextActions(subTaskResults, context);

    // 判断最终状态
    const status = this.determineStatus(subTaskResults);

    return {
      taskId: context.taskId,
      status,
      summary,
      subTasks: subTaskResults,
      artifacts,
      externalRecords,
      errors,
      nextActions,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * 构建子任务结果列表
   */
  private buildSubTaskResults(
    subTasks: SubTask[],
    results: Map<string, ToolCallResult>
  ): SubTaskResult[] {
    return subTasks.map((subTask) => {
      const result = results.get(subTask.id);

      if (!result) {
        return {
          subTaskId: subTask.id,
          status: "pending",
          toolId: subTask.toolId,
          retryCount: 0,
        };
      }

      return {
        subTaskId: subTask.id,
        status: this.getSubTaskStatus(result),
        toolId: subTask.toolId,
        result,
        error: result.error,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        retryCount: this.getRetryCount(result),
      };
    });
  }

  private getSubTaskStatus(result: ToolCallResult): SubTaskResult["status"] {
    const output = result.output as { skipped?: boolean; blocked?: boolean } | undefined;
    if (output?.skipped) return "skipped";
    if (output?.blocked) return "failed";
    return result.success ? "completed" : "failed";
  }

  private getRetryCount(result: ToolCallResult): number {
    const output = result.output as { attempts?: number } | undefined;
    return Math.max(0, (output?.attempts ?? 1) - 1);
  }

  /**
   * 提取产物（文件、截图等）
   */
  private extractArtifacts(results: Map<string, ToolCallResult>): Artifact[] {
    const artifacts: Artifact[] = [];

    for (const result of results.values()) {
      if (result.artifacts) {
        for (const artifact of result.artifacts) {
          artifacts.push({
            id: `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: artifact.type as "screenshot" | "file" | "data",
            name: artifact.name ?? "unnamed",
            url: artifact.url,
            content: artifact.content,
            mimeType: artifact.mimeType,
            size: artifact.size,
            createdAt: new Date(),
          });
        }
      }

      // 从输出中提取截图
      if (result.screenshots) {
        for (const screenshot of result.screenshots) {
          artifacts.push({
            id: `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: "screenshot",
            name: screenshot.name ?? "screenshot.png",
            url: screenshot.url,
            content: screenshot.data,
            mimeType: "image/png",
            createdAt: new Date(),
          });
        }
      }
    }

    return artifacts;
  }

  /**
   * 提取外部系统记录
   */
  private extractExternalRecords(results: Map<string, ToolCallResult>): ExternalRecord[] {
    const records: ExternalRecord[] = [];

    for (const [subTaskId, result] of results.entries()) {
      if (result.externalRecords) {
        for (const record of result.externalRecords) {
          records.push({
            system: record.system,
            id: record.id,
            type: record.type,
            url: record.url,
            metadata: record.metadata,
          });
        }
      }

      // 从输出中提取 ID 信息
      if (result.output) {
        const ids = this.extractIds(result.output);
        for (const id of ids) {
          records.push({
            system: this.inferSystem(subTaskId),
            id: id.value,
            type: id.type,
          });
        }
      }
    }

    return records;
  }

  /**
   * 从输出中提取 ID
   */
  private extractIds(output: unknown): Array<{ value: string; type: string }> {
    const ids: Array<{ value: string; type: string }> = [];

    // 如果是字符串，尝试解析
    if (typeof output === "string") {
      try {
        output = JSON.parse(output);
      } catch {
        // 不是 JSON，直接返回空
        return [];
      }
    }

    // 递归查找 ID 字段
    const findIds = (obj: unknown, path: string[] = []) => {
      if (!obj || typeof obj !== "object") return;

      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const currentPath = [...path, key];

        // 检查是否是 ID 字段
        if (key.toLowerCase().includes("id") && typeof value === "string") {
          ids.push({ value, type: currentPath.join(".") });
        }

        // 递归进入对象
        if (typeof value === "object") {
          findIds(value, currentPath);
        }
      }
    };

    findIds(output);
    return ids;
  }

  /**
   * 从子任务 ID 推断系统类型
   */
  private inferSystem(subTaskId: string): string {
    if (subTaskId.includes("feishu")) return "feishu";
    if (subTaskId.includes("boss")) return "boss";
    if (subTaskId.includes("email")) return "email";
    if (subTaskId.includes("crm")) return "crm";
    return "unknown";
  }

  /**
   * 提取错误信息
   */
  private extractErrors(results: SubTaskResult[]): ExecutionError[] {
    return results
      .filter((r) => r.status === "failed")
      .map((r) => ({
        subTaskId: r.subTaskId,
        error: r.error ?? "未知错误",
        retryable: this.isRetryableError(r.error),
        attempts: r.retryCount,
        timestamp: new Date(),
      }));
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error?: string): boolean {
    if (!error) return false;

    const retryablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /rate.?limit/i,
      /too.?many.?requests/i,
      /service.?unavailable/i,
      /server.?error/i,
      /temporarily/i,
    ];

    return retryablePatterns.some((pattern) => pattern.test(error));
  }

  /**
   * 生成执行摘要
   */
  private async generateSummary(
    results: SubTaskResult[],
    context: TaskContext
  ): Promise<string> {
    const total = results.length;
    const completed = results.filter((r) => r.status === "completed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    // 统计各系统操作
    const systemStats = this.countBySystem(results);

    // 生成摘要文本
    let summary = `任务执行完成。`;

    if (total > 0) {
      summary += `共 ${total} 个子任务，`;
      if (completed > 0) summary += `${completed} 个成功`;
      if (failed > 0) summary += `，${failed} 个失败`;
      if (skipped > 0) summary += `，${skipped} 个跳过`;
    }

    // 添加系统统计
    const systemEntries = Object.entries(systemStats);
    if (systemEntries.length > 0) {
      summary += `。操作统计：`;
      summary += systemEntries
        .map(([system, count]) => `${system} ${count} 次`)
        .join("，");
    }

    return summary;
  }

  /**
   * 按系统统计操作数量
   */
  private countBySystem(results: SubTaskResult[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const result of results) {
      if (result.toolId) {
        const system = this.inferSystem(result.toolId);
        counts[system] = (counts[system] || 0) + 1;
      }
    }

    return counts;
  }

  /**
   * 建议后续动作
   */
  private async suggestNextActions(
    results: SubTaskResult[],
    context: TaskContext
  ): Promise<string[]> {
    const actions: string[] = [];

    // 检查是否有失败的任务
    const failedTasks = results.filter((r) => r.status === "failed");
    if (failedTasks.length > 0) {
      actions.push(
        `重试失败的任务 (${failedTasks.map((t) => t.subTaskId).join(", ")})`
      );
    }

    // 检查是否有外部记录
    const hasExternalRecords = results.some((r) => r.result?.externalRecords?.length);
    if (hasExternalRecords) {
      actions.push("查看外部系统记录详情");
    }

    // 检查是否有产物
    const hasArtifacts = results.some((r) => r.result?.artifacts?.length);
    if (hasArtifacts) {
      actions.push("下载执行产物（截图、文件等）");
    }

    // 检查任务是否完成
    const allCompleted = results.every((r) => r.status === "completed");
    if (allCompleted) {
      actions.push("结束任务并归档");
    }

    return actions;
  }

  /**
   * 判断最终状态
   */
  private determineStatus(results: SubTaskResult[]): "PENDING" | "DONE" | "REJECTED" {
    if (results.length === 0) return "PENDING";

    const allCompleted = results.every((r) => r.status === "completed");
    if (allCompleted) return "DONE";

    return "REJECTED";
  }
}

/**
 * 全局结果聚合器实例
 */
export const resultAggregator = new ResultAggregator();
