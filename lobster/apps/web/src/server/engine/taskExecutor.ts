// ─────────────────────────────────────────────────────────
// 任务执行引擎
// 主入口，协调所有子模块完成任务执行
// ─────────────────────────────────────────────────────────

import { randomUUID } from "crypto";

import type {
  TaskContext,
  TaskExecutionResult,
  ExecutionCallbacks,
  SubTask,
  ExecutionState,
} from "./types";
import type { ToolCallResult } from "~/server/tools/types";
import { TaskTimeoutError, MaxStepsExceededError, ApprovalRejectedError, TaskAbortedError } from "./types";
import { taskDecomposer } from "./taskDecomposer";
import { toolSelector } from "./toolSelector";
import { ExecutionScheduler } from "./executionScheduler";
import { resultAggregator } from "./resultAggregator";
import { taskRepo } from "~/lib/repository";
import type { TaskDTO } from "@lobster/types";
import { db } from "~/server/db";
import { memoryService } from "~/server/memory/memoryService";
import { graphExtractor } from "~/server/knowledge/graphExtractor";

/**
 * 任务执行引擎
 * 协调任务拆解、工具选择、执行调度、结果聚合
 */
export class TaskExecutor {
  private readonly runningTasks = new Map<string, AbortController>();

  /**
   * 执行任务
   */
  async executeTask(
    taskId: string,
    context: TaskContext,
    callbacks?: ExecutionCallbacks
  ): Promise<TaskExecutionResult> {
    return this.runTaskExecution(taskId, context, callbacks);
  }

  private async runTaskExecution(
    taskId: string,
    context: TaskContext,
    callbacks?: ExecutionCallbacks,
    options?: {
      subTasks?: SubTask[];
      executionState?: ExecutionState;
    }
  ): Promise<TaskExecutionResult> {
    console.log(`[TaskExecutor] 开始执行任务: ${taskId}`);
    const startTime = Date.now();
    const abortController = new AbortController();
    const previousController = this.runningTasks.get(taskId);
    previousController?.abort();
    this.runningTasks.set(taskId, abortController);
    const executionContextBase: TaskContext = {
      ...context,
      signal: abortController.signal,
    };

    try {
      // 1. 更新任务状态为执行中
      await this.updateTaskStatus(taskId, "IN_PROGRESS");
      await this.ensureNotCancelled(taskId);

      // 2. 获取任务描述
      const taskDescription = await this.getTaskDescription(taskId);
      await this.ensureNotCancelled(taskId);

      // 3. 任务拆解 / 复用既有子任务
      const subTasks = options?.subTasks ?? await this.prepareSubTasks(taskDescription, executionContextBase);
      await this.ensureNotCancelled(taskId);

      if (subTasks.length === 0) {
        throw new Error("任务拆解失败，未生成子任务");
      }

      console.log(`[TaskExecutor] 任务拆解完成，${subTasks.length} 个子任务`);

      // 4. 触发进度回调
      await this.writeProgress(taskId, {
        total: subTasks.length,
        completed: 0,
        failed: 0,
        message: "开始执行子任务",
      });
      await callbacks?.onProgress?.({
        total: subTasks.length,
        completed: 0,
        failed: 0,
        message: "开始执行子任务",
      });

      // 5. 执行子任务
      await this.ensureNotCancelled(taskId);
      const executionContext = options?.executionState ? { ...executionContextBase, executionState: options.executionState } : executionContextBase;
      const results = await this.executeSubTasks(subTasks, executionContext, callbacks);
      await this.ensureNotCancelled(taskId);

      // 6. 聚合结果
      const taskResult = await resultAggregator.aggregate(subTasks, results, executionContext);
      await this.ensureNotCancelled(taskId);

      // 7. 更新任务状态
      await this.finalizeTask(taskId, taskResult, executionContext);

      console.log(
        `[TaskExecutor] 任务执行完成: ${taskId}, 耗时: ${Date.now() - startTime}ms`
      );

      return {
        ...taskResult,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`[TaskExecutor] 任务执行失败: ${taskId}`, error);

      // 更新任务状态为失败
      await this.updateTaskStatus(taskId, "REJECTED");

      // 处理特定错误
      if (error instanceof MaxStepsExceededError) {
        return this.createErrorResult(taskId, executionContextBase, "任务执行超出最大步骤限制", {
          maxSteps: error.maxSteps,
        });
      }

      if (error instanceof TaskTimeoutError) {
        return this.createErrorResult(taskId, executionContextBase, "任务执行超时", {
          timeout: error.timeout,
        });
      }

      if (error instanceof ApprovalRejectedError) {
        return this.createErrorResult(taskId, executionContextBase, `审批被拒绝: ${error.reason}`, {
          subTask: error.subTask.id,
        });
      }

      if (error instanceof TaskAbortedError) {
        return this.createErrorResult(taskId, executionContextBase, error.message, {
          cancelled: await this.isTaskCancelled(taskId),
        });
      }

      return this.createErrorResult(taskId, executionContextBase, (error as Error).message);
    } finally {
      if (this.runningTasks.get(taskId) === abortController) {
        this.runningTasks.delete(taskId);
      }
    }
  }

  private async prepareSubTasks(taskDescription: string, context: TaskContext): Promise<SubTask[]> {
    const subTasks = await taskDecomposer.decompose(taskDescription, context);
    await this.ensureNotCancelled(context.taskId);

    const toolSelections = await toolSelector.selectTools(subTasks, context);
    await this.ensureNotCancelled(context.taskId);

    // 更新子任务的工具 ID
    for (const subTask of subTasks) {
      const selection = toolSelections.get(subTask.id);
      if (!selection) continue;

      if (!subTask.toolId) {
        subTask.toolId = selection.tool.id;
      }

      if (selection.parameterSuggestions) {
        subTask.metadata = {
          ...subTask.metadata,
          parameters: {
            ...((subTask.metadata?.parameters as Record<string, unknown> | undefined) ?? {}),
            ...selection.parameterSuggestions,
          },
        };
      }
    }

    return subTasks;
  }

  /**
   * 执行子任务
   */
  private async executeSubTasks(
    subTasks: SubTask[],
    context: TaskContext,
    callbacks?: ExecutionCallbacks
  ): Promise<Map<string, import("~/server/tools/types").ToolCallResult>> {
    // 创建执行调度器
    const scheduler = new ExecutionScheduler(context, {
      onSubTaskStart: async (subTask) => {
        console.log(`[TaskExecutor] 开始子任务: ${subTask.id}`);
        await callbacks?.onSubTaskStart?.(subTask);

        await callbacks?.onProgress?.({
          total: subTasks.length,
          completed: scheduler.getState().completed.size,
          failed: scheduler.getState().failed.size,
          current: subTask.id,
          message: `执行中: ${subTask.description}`,
        });
      },
      onSubTaskComplete: async (subTask, result) => {
        console.log(`[TaskExecutor] 子任务完成: ${subTask.id}`);
        await callbacks?.onSubTaskComplete?.(subTask, result);

        await callbacks?.onProgress?.({
          total: subTasks.length,
          completed: scheduler.getState().completed.size,
          failed: scheduler.getState().failed.size,
          message: `已完成 ${scheduler.getState().completed.size}/${subTasks.length}`,
        });
      },
      onSubTaskError: async (subTask, error) => {
        console.error(`[TaskExecutor] 子任务失败: ${subTask.id}`, error);
        await callbacks?.onSubTaskError?.(subTask, error);
      },
      onApprovalRequired: async (subTask, approval) => {
        console.log(`[TaskExecutor] 等待审批: ${subTask.id}`);
        await callbacks?.onApprovalRequired?.(subTask, approval);
      },
      onInterventionRequired: async (details) => {
        console.log(`[TaskExecutor] 需要人类接管: ${details.title}`);
        await callbacks?.onInterventionRequired?.(details);
      },
    });

    return scheduler.execute(subTasks);
  }


  private async writeProgress(
    taskId: string,
    progress: {
      total: number;
      completed: number;
      failed: number;
      current?: string;
      message: string;
    }
  ): Promise<void> {
    const task = await taskRepo.findById(taskId);
    const result = this.parseTaskResult(task?.result);

    await taskRepo.update(taskId, {
      result: JSON.stringify({
        ...result,
        progress,
      }),
    });
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

  private async isTaskCancelled(taskId: string): Promise<boolean> {
    const task = await taskRepo.findById(taskId);
    const result = this.parseTaskResult(task?.result);
    return result.cancelled === true || result.cancelRequestedAt !== undefined;
  }

  private async ensureNotCancelled(taskId: string): Promise<void> {
    if (await this.isTaskCancelled(taskId)) {
      throw new TaskAbortedError("任务已取消");
    }
  }

  private buildExecutionContext(task: {
    id: string;
    tenantId: string;
    project?: { id: string } | null;
    permissionLevel: number;
  }, agent: { id: string; ownerId: string }): TaskContext {
    return {
      taskId: task.id,
      agentId: agent.id,
      projectId: task.project?.id ?? "default",
      tenantId: task.tenantId,
      supervisorId: agent.ownerId,
      config: {
        maxSteps: 20,
        maxRetries: 1,
        timeout: 60 * 60 * 1000,
        maxLevel: task.permissionLevel,
      },
    };
  }

  /**
   * 获取任务描述
   */
  private async getTaskDescription(taskId: string): Promise<string> {
    const task = await taskRepo.findById(taskId);

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    return task.description ?? task.title;
  }

  /**
   * 更新任务状态
   */
  private async updateTaskStatus(
    taskId: string,
    status: "PENDING" | "IN_PROGRESS" | "BLOCKED" | "AWAITING_APPROVAL" | "DONE" | "REJECTED"
  ): Promise<void> {
    const task = await taskRepo.findById(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    const updateData: Partial<TaskDTO> = { status };

    if (status === "IN_PROGRESS") {
      updateData.startedAt = new Date().toISOString();
    }

    if (status === "DONE" || status === "REJECTED") {
      updateData.completedAt = new Date().toISOString();
    }

    await taskRepo.update(taskId, updateData);
  }

  /**
   * 最终化任务
   */
  private async finalizeTask(
    taskId: string,
    result: TaskExecutionResult,
    context: TaskContext
  ): Promise<void> {
    await taskRepo.update(taskId, {
      status: result.status,
      completedAt: new Date().toISOString(),
      result: JSON.stringify({
        summary: result.summary,
        subTasks: result.subTasks,
        externalRecords: result.externalRecords,
        errors: result.errors,
        nextActions: result.nextActions,
        executionTimeMs: result.executionTimeMs,
      }),
    });

    const projectId = context.projectId ?? null;
    const writeSource = result.status === "DONE" ? "auto" : "suggested";

    await memoryService.createMemory(
      context.agentId,
      `任务执行：${result.status}`,
      result.summary,
      result.status === "DONE",
      projectId,
      writeSource,
      {
        taskId,
        taskStatus: result.status,
        projectId,
        summary: result.summary,
        subTaskCount: result.subTasks.length,
        artifactCount: result.artifacts.length,
        externalRecordCount: result.externalRecords.length,
        errorCount: result.errors.length,
        nextActions: result.nextActions,
        executionTimeMs: result.executionTimeMs,
      },
    );

    if (result.status !== "DONE") {
      for (const error of result.errors) {
        await memoryService.createMemory(
          context.agentId,
          `任务失败：${error.subTaskId}`,
          error.error,
          false,
          projectId,
          "suggested",
          {
            taskId,
            subTaskId: error.subTaskId,
            retryable: error.retryable,
            attempts: error.attempts,
            projectId,
            source: "suggested",
            error,
          },
        );
      }
    }

    // 从任务结果中提取知识图谱实体
    if (result.status === "DONE" && result.summary) {
      void graphExtractor.extractFromTaskResult(
        context.tenantId,
        `任务: ${result.summary.slice(0, 100)}`,
        JSON.stringify({ summary: result.summary, subTasks: result.subTasks }),
      );
    }
  }

  /**
   * 创建错误结果
   */
  private async createErrorResult(
    taskId: string,
    context: TaskContext,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<TaskExecutionResult> {
    const existingTask = await taskRepo.findById(taskId);
    const existingResult = this.parseTaskResult(existingTask?.result);
    const cancellationMetadata = existingResult.cancelled === true || existingResult.cancelRequestedAt !== undefined
      ? {
          cancelled: true,
          cancelRequestedAt: existingResult.cancelRequestedAt,
          cancelledAt: existingResult.cancelledAt ?? new Date().toISOString(),
        }
      : {};

    const result: TaskExecutionResult = {
      taskId,
      status: "REJECTED",
      summary: `任务执行失败: ${message}`,
      subTasks: [],
      artifacts: [],
      externalRecords: [],
      errors: [
        {
          subTaskId: "root",
          error: message,
          retryable: false,
          attempts: 1,
          timestamp: new Date(),
          ...cancellationMetadata,
          ...metadata,
        } as any,
      ],
      nextActions: ["查看错误详情", "重试任务", "联系管理员"],
      executionTimeMs: 0,
    };

    await taskRepo.update(taskId, {
      status: "REJECTED",
      completedAt: new Date().toISOString(),
      result: JSON.stringify({
        ...existingResult,
        ...cancellationMetadata,
        summary: result.summary,
        subTasks: result.subTasks,
        externalRecords: result.externalRecords,
        errors: result.errors,
        nextActions: result.nextActions,
        executionTimeMs: result.executionTimeMs,
      }),
    });

    return result;
  }

  /**
   * 重试失败的任务
   */
  async retryTask(
    taskId: string,
    failedSubTaskIds?: string[]
  ): Promise<TaskExecutionResult> {
    const task = await taskRepo.findById(taskId);

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    const agent = task.assignee
      ? await db.agent.findUnique({ where: { id: task.assignee.id }, include: { owner: true } })
      : await db.agent.findFirst({
          where: { tenantId: task.tenantId, isActive: true },
          orderBy: { createdAt: "asc" },
          include: { owner: true },
        });

    if (!agent) {
      throw new Error("没有可执行任务的 Agent");
    }

    if (!task.assignee) {
      await taskRepo.update(taskId, {
        assignee: {
          id: agent.id,
          name: agent.name,
          avatar: agent.avatar ?? null,
        },
      });
    }

    const previousResult = this.parseTaskResult(task.result);
    const retryHistory = Array.isArray(previousResult.retryHistory)
      ? previousResult.retryHistory
      : [];
    const previousSubTasks = Array.isArray(previousResult.subTasks)
      ? previousResult.subTasks as Array<{ subTaskId?: string; dependsOn?: string[]; toolId?: string; description?: string; metadata?: Record<string, unknown>; result?: ToolCallResult }>
      : [];
    const previousSubTaskMap = new Map<string, { subTaskId?: string; dependsOn?: string[]; toolId?: string; description?: string; metadata?: Record<string, unknown>; result?: ToolCallResult }>();
    for (const subTask of previousSubTasks) {
      if (subTask.subTaskId) {
        previousSubTaskMap.set(subTask.subTaskId, subTask);
      }
    }

    const retrySubTaskIds = failedSubTaskIds?.length
      ? failedSubTaskIds.filter((id): id is string => Boolean(id))
      : previousSubTasks
          .filter((subTask) => subTask.result && !subTask.result.success && subTask.subTaskId)
          .map((subTask) => subTask.subTaskId as string);
    const retrySet = new Set<string>(retrySubTaskIds);
    const dependentSubTaskIds = new Set<string>();
    for (const subTask of previousSubTasks) {
      if (!subTask.subTaskId || retrySet.has(subTask.subTaskId)) continue;

      const dependsOn = Array.isArray(subTask.dependsOn) ? subTask.dependsOn : [];
      if (dependsOn.some((depId) => retrySet.has(depId))) {
        dependentSubTaskIds.add(subTask.subTaskId);
      }
    }

    const replaySubTaskIds = new Set<string>([...retrySet, ...dependentSubTaskIds]);
    const preservedSubTasks = previousSubTasks.filter((subTask) => {
      if (!subTask.subTaskId) return false;
      return !replaySubTaskIds.has(subTask.subTaskId) && Boolean(subTask.result?.success);
    });
    const replaySubTasks = previousSubTasks.filter((subTask) => {
      if (!subTask.subTaskId) return false;
      return replaySubTaskIds.has(subTask.subTaskId);
    });
    const preservedResults = new Map<string, ToolCallResult>();
    for (const subTask of preservedSubTasks) {
      if (subTask.subTaskId && subTask.result) {
        preservedResults.set(subTask.subTaskId, subTask.result);
      }
    }

    const executionState: ExecutionState = {
      currentStep: 0,
      completedSubTasks: preservedSubTasks.map((subTask) => subTask.subTaskId).filter((id): id is string => Boolean(id)),
      pendingSubTasks: replaySubTasks.map((subTask) => subTask.subTaskId).filter((id): id is string => Boolean(id)),
      failedSubTasks: [],
      results: preservedResults,
      errors: [],
    };


    await taskRepo.update(taskId, {
      status: "PENDING",
      startedAt: null,
      completedAt: null,
      result: JSON.stringify({
        retrying: true,
        retryStartedAt: new Date().toISOString(),
        retrySubTaskIds,
        retryHistory: [
          ...retryHistory,
          {
            status: task.status,
            result: previousResult,
            completedAt: task.completedAt,
            retriedAt: new Date().toISOString(),
          },
        ],
      }),
    });

    const executionContext = this.buildExecutionContext(task, agent);
    const filteredSubTasks = replaySubTasks.length > 0
      ? replaySubTasks.map((subTask) => {
          const previous = previousSubTaskMap.get(subTask.subTaskId!);
          return {
            id: subTask.subTaskId ?? randomUUID(),
            description: previous?.description ?? task.description ?? task.title,
            dependsOn: Array.isArray(subTask.dependsOn) ? subTask.dependsOn : [],
            estimatedLevel: task.permissionLevel,
            requiresApproval: false,
            toolId: subTask.toolId,
            metadata: previous?.metadata,
          };
        })
      : undefined;

    return this.runTaskExecution(taskId, executionContext, undefined, {
      subTasks: filteredSubTasks,
      executionState,
    });
  }


  /**
   * 取消正在执行的任务
   */
  async cancelTask(taskId: string): Promise<void> {
    const task = await taskRepo.findById(taskId);

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    const result = this.parseTaskResult(task.result);
    const cancelRequestedAt = result.cancelRequestedAt ?? new Date().toISOString();

    this.runningTasks.get(taskId)?.abort();

    await taskRepo.update(taskId, {
      status: "REJECTED",
      completedAt: new Date().toISOString(),
      result: JSON.stringify({
        ...result,
        cancelled: true,
        cancelRequestedAt,
        cancelledAt: new Date().toISOString(),
      }),
    });
  }

  /**
   * 获取任务执行进度
   */
  async getTaskProgress(taskId: string): Promise<{
    status: string;
    progress: number;
    currentStep?: string;
    message?: string;
  }> {
    const task = await taskRepo.findById(taskId);

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    const status = task.status;

    return {
      status,
      progress:
        status === "DONE"
          ? 100
          : status === "IN_PROGRESS"
          ? 50
          : status === "AWAITING_APPROVAL" || status === "BLOCKED"
          ? 50
          : 0,
      message: this.getStatusMessage(status),
    };
  }

  /**
   * 获取状态消息
   */
  private getStatusMessage(status: string): string {
    const messages: Record<string, string> = {
      PENDING: "等待执行",
      IN_PROGRESS: "执行中",
      BLOCKED: "等待人工接管",
      AWAITING_APPROVAL: "等待审批",
      DONE: "已完成",
      REJECTED: "执行失败",
    };
    return messages[status] ?? status;
  }
}

/**
 * 全局任务执行引擎实例
 */
export const taskExecutor = new TaskExecutor();