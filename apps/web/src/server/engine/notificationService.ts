// ─────────────────────────────────────────────────────────
// 执行引擎通知服务
// V2: 多渠道真实通知（邮件 + 飞书 + Webhook） + 审计日志
// ─────────────────────────────────────────────────────────

import { auditRepo } from "~/lib/repository";
import { channelManager } from "~/server/notifications/channels";

interface NotificationRecipient {
  id: string;
  name: string;
  email?: string | null;
}

interface ApprovalNotificationPayload {
  type: "approval_requested" | "approval_decided";
  approvalId: string;
  taskId: string;
  tenantId: string;
  title: string;
  recipient: NotificationRecipient;
  message: string;
}

interface InterventionNotificationPayload {
  interventionTaskId: string;
  originalTaskId: string;
  tenantId: string;
  title: string;
  recipient: NotificationRecipient;
  message: string;
}

export class NotificationService {
  async notifyApproval(payload: ApprovalNotificationPayload): Promise<void> {
    await this.persistNotification({
      category: payload.type,
      recipient: payload.recipient,
      tenantId: payload.tenantId,
      title: payload.title,
      message: payload.message,
      metadata: {
        approvalId: payload.approvalId,
        taskId: payload.taskId,
      },
    });
  }

  async notifyIntervention(payload: InterventionNotificationPayload): Promise<void> {
    await this.persistNotification({
      category: "human_intervention",
      recipient: payload.recipient,
      tenantId: payload.tenantId,
      title: payload.title,
      message: payload.message,
      metadata: {
        interventionTaskId: payload.interventionTaskId,
        originalTaskId: payload.originalTaskId,
      },
    });
  }

  private async persistNotification(input: {
    category: string;
    recipient: NotificationRecipient;
    tenantId: string;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    // 1. 审计日志（始终执行）
    try {
      await auditRepo.log({
        tenantId: input.tenantId,
        employeeId: input.recipient.id,
        action: `NOTIFY_${input.category.toUpperCase()}`,
        detail: {
          title: input.title,
          message: input.message,
          recipientId: input.recipient.id,
          recipientName: input.recipient.name,
          recipientEmail: input.recipient.email ?? undefined,
          ...input.metadata,
        },
      });
    } catch (error) {
      console.warn("[NotificationService] 审计日志记录失败", error);
    }

    // 2. 真实通知渠道（邮件、飞书、Webhook）
    channelManager.broadcast({
      title: input.title,
      message: input.message,
      category: input.category,
      recipientName: input.recipient.name,
      recipientEmail: input.recipient.email,
      metadata: input.metadata,
    }).catch((error) => {
      console.warn("[NotificationService] 渠道广播失败", error);
    });
  }
}

export const notificationService = new NotificationService();
