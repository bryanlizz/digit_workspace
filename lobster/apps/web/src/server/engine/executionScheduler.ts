// ─────────────────────────────────────────────────────────
// 执行调度器
// 按依赖顺序执行子任务，处理审批和人类接管
// ─────────────────────────────────────────────────────────

import type {
  SubTask,
  TaskContext,
  ExecutionCallbacks,
  Approval,
  Approver,
  InterventionDecision,
} from "./types";
import type { ToolCallResult, ToolCallContext } from "~/server/tools/types";
import {
  ApprovalRejectedError,
  MaxStepsExceededError,
  InterventionTimeoutError,
  TaskAbortedError,
} from "./types";
import { toolRegistry } from "~/server/tools/toolRegistry";
import { approvalEngine } from "./approvalEngine";
import { approvalService } from "./approvalService";
import { humanInterventionHandler } from "./humanIntervention";
import { taskRepo } from "~/lib/repository";

/**
 * 执行状态
 */
interface SchedulerState {
  completed: Set<string>;
  running: Set<string>;
  pending: Set<string>;
  failed: Set<string>;
  skipped: Set<string>;
  waitingApproval: Set<string>;
  results: Map<string, ToolCallResult>;
  attempts: Map<string, number>;
}

/**
 * 执行调度器
 */
export class ExecutionScheduler {
  private state: SchedulerState;
  private context: TaskContext;
  private callbacks?: ExecutionCallbacks;

  constructor(context: TaskContext, callbacks?: ExecutionCallbacks) {
    this.context = context;
    this.callbacks = callbacks;
    this.state = {
      completed: new Set(),
      running: new Set(),
      pending: new Set(),
      failed: new Set(),
      skipped: new Set(),
      waitingApproval: new Set(),
      results: new Map(),
      attempts: new Map(),
    };

    if (context.executionState) {
      for (const task of context.executionState.completedSubTasks) {
        this.state.completed.add(task);
      }

      for (const task of context.executionState.failedSubTasks) {
        this.state.failed.add(task);
      }

      for (const [taskId, result] of context.executionState.results) {
        this.state.results.set(taskId, result);
      }

      for (const task of context.executionState.pendingSubTasks) {
        this.state.pending.add(task);
      }
    }
  }

  /**
   * 执行子任务列表
   */
  async execute(subTasks: SubTask[]): Promise<Map<string, ToolCallResult>> {
    // 拓扑排序（含依赖缺失 / 环检测）
    const sortedTasks = this.topologicalSort(subTasks);

    for (const task of sortedTasks) {
      if (
        this.state.completed.has(task.id) ||
        this.state.failed.has(task.id) ||
        this.state.running.has(task.id) ||
        this.state.pending.has(task.id)
      ) {
        continue;
      }

      this.state.pending.add(task.id);
    }

    // 按批次执行（同一批内可并行）
    while (this.state.pending.size > 0) {
      await this.ensureNotCancelled();

      const totalSteps = this.state.completed.size + this.state.running.size + this.state.failed.size;
      if (totalSteps >= this.context.config.maxSteps) {
        throw new MaxStepsExceededError(this.context.taskId, this.context.config.maxSteps);
      }

      const executableTasks = this.getExecutableTasks(sortedTasks);

      if (executableTasks.length === 0) {
        this.markBlockedTasks(sortedTasks);
        break;
      }

      await Promise.all(executableTasks.map((task) => this.executeSubTask(task)));
    }

    return this.state.results;
  }

  /**
   * 执行单个子任务
   */
  private async executeSubTask(subTask: SubTask): Promise<void> {
    this.state.pending.delete(subTask.id);
    this.state.running.add(subTask.id);

    try {
      await this.ensureNotCancelled();
      await this.callbacks?.onSubTaskStart?.(subTask);
      await this.ensureNotCancelled();

      const approvalDecision = await approvalEngine.requiresApproval(
        subTask,
        this.context
      );

      if (approvalDecision.required) {
        await this.waitForApproval(subTask, approvalDecision);
      }

      await this.ensureNotCancelled();
      const result = await this.callToolWithRetries(subTask);
      await this.ensureNotCancelled();
      if (!result.success) {
        throw new Error(result.error ?? `工具 ${subTask.toolId} 执行失败`);
      }

      this.state.running.delete(subTask.id);
      this.state.completed.add(subTask.id);
      this.state.results.set(subTask.id, result);

      await this.callbacks?.onSubTaskComplete?.(subTask, result);
    } catch (error) {
      this.state.running.delete(subTask.id);

      if (error instanceof ApprovalRejectedError || error instanceof TaskAbortedError) {
        this.markFailed(subTask, error, false);
        throw error;
      }

      this.markFailed(subTask, error as Error, this.isRetryableError(error));
      await this.callbacks?.onSubTaskError?.(subTask, error as Error);

      const intervention = humanInterventionHandler.shouldIntercept(
        error as Error,
        this.context,
        subTask
      );

      if (intervention.shouldIntercept) {
        await this.triggerIntervention(subTask, intervention);
      } else {
        console.error(`[ExecutionScheduler] 子任务 ${subTask.id} 执行失败:`, error);
      }
    }
  }

  private async callToolWithRetries(subTask: SubTask): Promise<ToolCallResult> {
    const maxAttempts = Math.max(1, this.context.config.maxRetries + 1);
    let lastResult: ToolCallResult | null = null;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      await this.ensureNotCancelled();
      this.state.attempts.set(subTask.id, attempt);
      await this.callbacks?.onProgress?.({
        total: this.getTotalCount(),
        completed: this.state.completed.size,
        failed: this.state.failed.size,
        blocked: this.getBlockedCount(),
        attempts: attempt,
        current: subTask.id,
        message: attempt > 1 ? `重试子任务: ${subTask.description}` : `执行子任务: ${subTask.description}`,
      });

      try {
        const result = await this.callTool(subTask);
        lastResult = result;
        if (result.success) {
          return result;
        }

        const retryable = this.isRetryableError(result.error);
        if (!retryable || attempt >= maxAttempts) {
          return result;
        }
      } catch (error) {
        lastError = error as Error;
        if (!this.isRetryableError(error) || attempt >= maxAttempts) {
          throw error;
        }
      }

      await this.sleep(Math.min(1000 * attempt, 5000));
    }

    if (lastResult) return lastResult;
    throw lastError ?? new Error(`子任务 ${subTask.id} 执行失败`);
  }

  /**
   * 等待审批
   */
  private async waitForApproval(
    subTask: SubTask,
    decision: { approver?: Approver; urgency?: "low" | "normal" | "high" }
  ): Promise<void> {
    const approver = decision.approver ?? approvalEngine.createApprover(this.context);

    const approval = await approvalService.createApproval({
      taskId: this.context.taskId,
      subTask,
      approver,
      urgency: decision.urgency ?? "normal",
      timeout: 3600,
      context: this.context,
    });

    this.state.waitingApproval.add(subTask.id);
    await this.updateTaskStatus("AWAITING_APPROVAL");
    await this.callbacks?.onApprovalRequired?.(subTask, approval);

    try {
      const result = await this.pollApprovalResult(approval.id, approval.expiresAt);

      this.state.waitingApproval.delete(subTask.id);
      await this.updateTaskStatus("IN_PROGRESS");

      if (result.decision === "rejected") {
        throw new ApprovalRejectedError(subTask, result.reason);
      }
    } catch (error) {
      this.state.waitingApproval.delete(subTask.id);
      await this.updateTaskStatus("REJECTED");

      if (error instanceof ApprovalRejectedError) {
        throw error;
      }

      throw new ApprovalRejectedError(subTask, "审批超时或取消");
    }
  }

  /**
   * 轮询审批结果
   */
  private async pollApprovalResult(
    approvalId: string,
    expiresAt: Date,
    pollInterval: number = 5000
  ): Promise<{ decision?: string; reason?: string }> {
    return new Promise((resolve, reject) => {
      const checkApproval = async () => {
        try {
          await this.ensureNotCancelled();
        } catch (error) {
          reject(error);
          return;
        }

        if (new Date() > expiresAt) {
          reject(new Error("审批超时"));
          return;
        }

        const approval = await approvalService.getApproval(approvalId);

        if (!approval) {
          reject(new Error("审批不存在"));
          return;
        }

        if (approval.status === "approved" || approval.status === "rejected") {
          resolve({
            decision: approval.decision,
            reason: approval.reason,
          });
          return;
        }

        if (approval.status === "expired" || approval.status === "cancelled") {
          reject(new Error(`审批已${approval.status === "expired" ? "超时" : "取消"}`));
          return;
        }

        setTimeout(checkApproval, pollInterval);
      };

      checkApproval();
    });
  }

  /**
   * 调用工具
   */
  private async callTool(subTask: SubTask): Promise<ToolCallResult> {
    if (!subTask.toolId) {
      throw new Error(`子任务 ${subTask.id} 没有指定工具`);
    }

    const tool = toolRegistry.getTool(subTask.toolId);
    if (!tool) {
      throw new Error(`工具 ${subTask.toolId} 不存在`);
    }

    const parameters = this.buildParameters(subTask, tool);
    const context: ToolCallContext = {
      taskId: this.context.taskId,
      agentId: this.context.agentId,
      projectId: this.context.projectId,
      tenantId: this.context.tenantId,
      signal: this.context.signal,
      caller: {
        id: this.context.agentId,
        name: this.context.agentId,
        type: "agent",
      },
    };

    return toolRegistry.execute(subTask.toolId, parameters, context);
  }

  /**
   * 构建工具参数
   */
  private buildParameters(
    subTask: SubTask,
    tool: { parameters: Array<{ name: string; required?: boolean; default?: unknown }> }
  ): Record<string, unknown> {
    const parameters: Record<string, unknown> = {};

    const metaParams = subTask.metadata?.parameters as Record<string, unknown> | undefined;
    if (metaParams) {
      for (const [key, value] of Object.entries(metaParams)) {
        parameters[key] = value;
      }
    }

    for (const param of tool.parameters) {
      if (parameters[param.name] === undefined && param.default !== undefined) {
        parameters[param.name] = param.default;
      }
    }

    return parameters;
  }

  /**
   * 触发人类接管
   */
  private async triggerIntervention(
    subTask: SubTask,
    decision: InterventionDecision
  ): Promise<void> {
    await this.updateTaskStatus("BLOCKED");

    const interventionTaskId = await humanInterventionHandler.triggerIntervention(
      {
        type: decision.type ?? "manual_required",
        title: `子任务执行失败: ${subTask.description}`,
        description: decision.message ?? "执行过程中遇到需要人工处理的情况",
        attempts: this.state.attempts.get(subTask.id) ?? 1,
        lastError: decision.message,
      },
      this.context
    );

    try {
      const result = await humanInterventionHandler.waitForIntervention(
        interventionTaskId,
        this.context.config.timeout
      );

      if (result.action === "resume") {
        await humanInterventionHandler.resumeFromIntervention(
          this.context.taskId,
          result.resumeFrom ?? subTask.id
        );
        this.state.failed.delete(subTask.id);
        this.state.results.delete(subTask.id);
        this.state.pending.add(result.resumeFrom ?? subTask.id);
        return;
      }

      if (result.action === "skip") {
        await this.updateTaskStatus("IN_PROGRESS");
        this.state.failed.delete(subTask.id);
        this.state.skipped.add(result.skipSubTaskId ?? subTask.id);
        this.state.completed.add(result.skipSubTaskId ?? subTask.id);
        this.state.results.set(result.skipSubTaskId ?? subTask.id, {
          success: true,
          output: { skipped: true, reason: result.reason ?? "人工决定跳过" },
          executionTimeMs: 0,
          completedAt: new Date(),
        });
        return;
      }

      throw new TaskAbortedError(result.reason ?? "人工决定终止任务");
    } catch (error) {
      if (error instanceof TaskAbortedError) {
        throw error;
      }
      throw new InterventionTimeoutError(interventionTaskId, this.context.config.timeout);
    }
  }

  private markFailed(subTask: SubTask, error: Error, retryable: boolean): void {
    const attempts = this.state.attempts.get(subTask.id) ?? 1;
    this.state.failed.add(subTask.id);
    this.state.results.set(subTask.id, {
      success: false,
      error: error.message,
      executionTimeMs: 0,
      completedAt: new Date(),
      output: {
        retryable,
        attempts,
      },
    });
  }

  /**
   * 更新任务状态
   */
  private async updateTaskStatus(status: "IN_PROGRESS" | "BLOCKED" | "AWAITING_APPROVAL" | "REJECTED"): Promise<void> {
    await taskRepo.update(this.context.taskId, { status });
  }

  private parseTaskResult(result?: string | null): Record<string, unknown> {
    if (!result) return {};

    try {
      const parsed = JSON.parse(result) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private async ensureNotCancelled(): Promise<void> {
    if (this.context.signal?.aborted) {
      throw new TaskAbortedError("任务已取消");
    }

    const task = await taskRepo.findById(this.context.taskId);
    const result = this.parseTaskResult(task?.result);
    if (result.cancelled === true || result.cancelRequestedAt !== undefined) {
      throw new TaskAbortedError("任务已取消");
    }
  }

  private getExecutableTasks(subTasks: SubTask[]): SubTask[] {
    return subTasks.filter((task) => {
      if (!this.state.pending.has(task.id)) {
        return false;
      }

      return task.dependsOn.every((depId) => this.state.completed.has(depId));
    });
  }

  private markBlockedTasks(subTasks: SubTask[]): void {
    for (const task of subTasks) {
      if (!this.state.pending.has(task.id)) continue;

      const failedDeps = task.dependsOn.filter((depId) => this.state.failed.has(depId));
      const pendingDeps = task.dependsOn.filter((depId) => this.state.pending.has(depId));
      const reason = failedDeps.length > 0
        ? `依赖子任务失败: ${failedDeps.join(", ")}`
        : `依赖未完成: ${pendingDeps.join(", ")}`;

      this.state.pending.delete(task.id);
      this.state.failed.add(task.id);
      this.state.results.set(task.id, {
        success: false,
        error: reason,
        executionTimeMs: 0,
        completedAt: new Date(),
        output: { blocked: true, failedDeps, pendingDeps },
      });
    }
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(subTasks: SubTask[]): SubTask[] {
    const taskMap = new Map(subTasks.map((t) => [t.id, t]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: SubTask[] = [];

    const visit = (task: SubTask, path: string[]) => {
      if (visited.has(task.id)) return;

      if (visiting.has(task.id)) {
        const cycleStart = path.indexOf(task.id);
        const cyclePath = [...path.slice(cycleStart), task.id].join(" -> ");
        throw new Error(`子任务依赖存在环: ${cyclePath}`);
      }

      visiting.add(task.id);

      for (const depId of task.dependsOn) {
        const dep = taskMap.get(depId);
        if (!dep) {
          if (this.state.completed.has(depId) || this.state.results.has(depId)) {
            continue;
          }

          throw new Error(`子任务 ${task.id} 依赖不存在的子任务: ${depId}`);
        }
        visit(dep, [...path, depId]);
      }

      visiting.delete(task.id);
      visited.add(task.id);
      result.push(task);
    };

    for (const task of subTasks) {
      visit(task, [task.id]);
    }

    return result;
  }

  private isRetryableError(error?: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? "");
    if (!message) return false;

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

    return retryablePatterns.some((pattern) => pattern.test(message));
  }

  private getTotalCount(): number {
    return this.state.completed.size + this.state.running.size + this.state.pending.size + this.state.failed.size;
  }

  private getBlockedCount(): number {
    return Array.from(this.state.results.values()).filter((result) => {
      const output = result.output as { blocked?: boolean } | undefined;
      return output?.blocked;
    }).length;
  }

  private sleep(ms: number): Promise<void> {
    if (this.context.signal?.aborted) {
      return Promise.reject(new TaskAbortedError("任务已取消"));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      this.context.signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timeout);
          reject(new TaskAbortedError("任务已取消"));
        },
        { once: true }
      );
    });
  }

  /**
   * 获取执行状态
   */
  getState(): Readonly<SchedulerState> {
    return { ...this.state };
  }

  /**
   * 获取子任务结果
   */
  getResult(subTaskId: string): ToolCallResult | undefined {
    return this.state.results.get(subTaskId);
  }

  /**
   * 检查是否所有任务都完成
   */
  isComplete(): boolean {
    return this.state.pending.size === 0;
  }

  /**
   * 检查是否有失败的任务
   */
  hasFailures(): boolean {
    return this.state.failed.size > 0;
  }

  /**
   * 获取完成百分比
   */
  getProgress(): number {
    const total =
      this.state.completed.size +
      this.state.running.size +
      this.state.pending.size +
      this.state.failed.size +
      this.state.waitingApproval.size;

    if (total === 0) return 0;

    return (this.state.completed.size / total) * 100;
  }
}
