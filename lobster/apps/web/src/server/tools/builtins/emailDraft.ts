// ─────────────────────────────────────────────────────────
// 邮件草稿 Tool
// AI 生成邮件内容，支持预览和发送审批
// ─────────────────────────────────────────────────────────

import type { ToolDefinition, ToolCallResult, ToolCallContext } from "~/server/tools/types";
import { toolRegistry } from "../toolRegistry";
import { withAudit } from "../toolAudit";

/**
 * 邮件草稿 Tool
 */
export const emailDraftTool: ToolDefinition = {
  id: "email.draft",
  name: "生成邮件草稿",
  description: "让 AI 根据上下文生成专业邮件内容。生成的草稿需要人工确认后才能发送。",
  systemType: "email",
  requiredLevel: 0, // L0: 生成内容不需要审批
  requiresApproval: false,
  parameters: [
    {
      name: "purpose",
      type: "string",
      description: "邮件目的（面试邀请、offer发放、拒信、跟进等）",
      required: true,
      enum: ["interview_invite", "offer", "rejection", "follow_up", "general"],
    },
    {
      name: "recipientName",
      type: "string",
      description: "收件人姓名",
      required: true,
    },
    {
      name: "recipientEmail",
      type: "string",
      description: "收件人邮箱",
      required: true,
    },
    {
      name: "position",
      type: "string",
      description: "应聘职位",
      required: false,
    },
    {
      name: "companyName",
      type: "string",
      description: "公司名称",
      required: false,
    },
    {
      name: "interviewTime",
      type: "string",
      description: "面试时间（如有）",
      required: false,
    },
    {
      name: "interviewAddress",
      type: "string",
      description: "面试地点（如有）",
      required: false,
    },
    {
      name: "additionalInfo",
      type: "string",
      description: "其他补充信息",
      required: false,
    },
    {
      name: "tone",
      type: "string",
      description: "邮件语气",
      required: false,
      enum: ["formal", "friendly", "professional"],
      default: "professional",
    },
  ],
  outputSchema: {
    type: "object",
    description: "返回生成的邮件草稿",
  },
};

/**
 * 生成面试邀请邮件模板
 */
function generateInterviewInvite(params: {
  recipientName: string;
  position: string;
  companyName: string;
  interviewTime: string;
  interviewAddress?: string;
  tone: string;
}): { subject: string; html: string; text: string } {
  const greeting = params.tone === "friendly" ? "您好" : "尊敬的";
  const closing = params.tone === "friendly" ? "期待您的回复" : "感谢您的关注，期待您的回复";

  const subject = `【${params.companyName}】面试邀请 - ${params.position}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>${greeting} ${params.recipientName}，</p>
      <p>非常感谢您投递 <strong>${params.position}</strong> 岗位，经过我们的评估，很荣幸邀请您参加面试。</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>📅 面试时间：</strong>${params.interviewTime}</p>
        ${params.interviewAddress ? `<p><strong>📍 面试地点：</strong>${params.interviewAddress}</p>` : ""}
      </div>
      <p>如有任何问题，请回复此邮件或拨打我们的联系电话。</p>
      <p>${closing}！</p>
      <p style="margin-top: 20px;">此致<br/>敬礼</p>
      <p><strong>${params.companyName}</strong> HR 团队</p>
    </div>
  `;

  const text = `
${greeting} ${params.recipientName}，

非常感谢您投递 ${params.position} 岗位，经过我们的评估，很荣幸邀请您参加面试。

面试时间：${params.interviewTime}
${params.interviewAddress ? `面试地点：${params.interviewAddress}` : ""}

如有任何问题，请回复此邮件或拨打我们的联系电话。

${closing}！

此致
敬礼

${params.companyName} HR 团队
  `.trim();

  return { subject, html, text };
}

/**
 * 生成 Offer 邮件模板
 */
function generateOffer(params: {
  recipientName: string;
  position: string;
  companyName: string;
  salary?: string;
  startDate?: string;
  tone: string;
}): { subject: string; html: string; text: string } {
  const greeting = params.tone === "friendly" ? "您好" : "尊敬的";

  const subject = `【${params.companyName}】Offer 邀请 - ${params.position}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>${greeting} ${params.recipientName}，</p>
      <p>恭喜您！经过多轮面试，我们很高兴向您发出 <strong>${params.position}</strong> 岗位的录用通知。</p>
      <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
        <p><strong>📋 岗位：</strong>${params.position}</p>
        ${params.salary ? `<p><strong>💰 薪资：</strong>${params.salary}</p>` : ""}
        ${params.startDate ? `<p><strong>📅 入职日期：</strong>${params.startDate}</p>` : ""}
      </div>
      <p>附件为正式的 Offer 函，请查收。如确认接受，请回复此邮件。</p>
      <p>期待您的加入！</p>
      <p style="margin-top: 20px;">此致<br/>敬礼</p>
      <p><strong>${params.companyName}</strong> HR 团队</p>
    </div>
  `;

  const text = `
${greeting} ${params.recipientName}，

恭喜您！经过多轮面试，我们很高兴向您发出 ${params.position} 岗位的录用通知。

岗位：${params.position}
${params.salary ? `薪资：${params.salary}` : ""}
${params.startDate ? `入职日期：${params.startDate}` : ""}

附件为正式的 Offer 函，请查收。如确认接受，请回复此邮件。

期待您的加入！

此致
敬礼

${params.companyName} HR 团队
  `.trim();

  return { subject, html, text };
}

/**
 * 生成拒信模板
 */
function generateRejection(params: {
  recipientName: string;
  position: string;
  companyName: string;
  tone: string;
}): { subject: string; html: string; text: string } {
  const greeting = params.tone === "friendly" ? "您好" : "尊敬的";

  const subject = `【${params.companyName}】${params.position} 岗位申请结果`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>${greeting} ${params.recipientName}，</p>
      <p>感谢您对 <strong>${params.companyName}</strong> <strong>${params.position}</strong> 岗位的关注。</p>
      <p>经过认真评估，我们决定暂不推进您的申请。这个决定非常艰难，因为您的简历给我们留下了深刻印象。</p>
      <p>我们已将您的信息纳入人才库，如有合适的机会，会第一时间与您联系。</p>
      <p>祝您职业发展顺利！</p>
      <p style="margin-top: 20px;">此致<br/>敬礼</p>
      <p><strong>${params.companyName}</strong> HR 团队</p>
    </div>
  `;

  const text = `
${greeting} ${params.recipientName}，

感谢您对 ${params.companyName} ${params.position} 岗位的关注。

经过认真评估，我们决定暂不推进您的申请。这个决定非常艰难，因为您的简历给我们留下了深刻印象。

我们已将您的信息纳入人才库，如有合适的机会，会第一时间与您联系。

祝您职业发展顺利！

此致
敬礼

${params.companyName} HR 团队
  `.trim();

  return { subject, html, text };
}

/**
 * 邮件草稿执行器
 */
const emailDraftExecutor = withAudit(async (tool, params, context) => {
  const startTime = Date.now();
  const p = params as {
    purpose: string;
    recipientName: string;
    recipientEmail: string;
    position?: string;
    companyName?: string;
    interviewTime?: string;
    interviewAddress?: string;
    additionalInfo?: string;
    tone?: string;
  };

  try {
    let draft: { subject: string; html: string; text: string };

    switch (p.purpose) {
      case "interview_invite":
        if (!p.interviewTime || !p.companyName) {
          return {
            success: false,
            error: "生成面试邀请邮件需要提供面试时间和公司名称",
            executionTimeMs: Date.now() - startTime,
          };
        }
        draft = generateInterviewInvite({
          recipientName: p.recipientName,
          position: p.position ?? "该岗位",
          companyName: p.companyName,
          interviewTime: p.interviewTime,
          interviewAddress: p.interviewAddress,
          tone: p.tone ?? "professional",
        });
        break;

      case "offer":
        draft = generateOffer({
          recipientName: p.recipientName,
          position: p.position ?? "该岗位",
          companyName: p.companyName ?? "我司",
          tone: p.tone ?? "professional",
        });
        break;

      case "rejection":
        draft = generateRejection({
          recipientName: p.recipientName,
          position: p.position ?? "该岗位",
          companyName: p.companyName ?? "我司",
          tone: p.tone ?? "professional",
        });
        break;

      default:
        return {
          success: false,
          error: `不支持的邮件类型: ${p.purpose}`,
          executionTimeMs: Date.now() - startTime,
        };
    }

    return {
      success: true,
      data: {
        ...draft,
        recipientEmail: p.recipientEmail,
        purpose: p.purpose,
        additionalInfo: p.additionalInfo,
        /** 草稿 ID，用于后续确认发送 */
        draftId: `draft_${Date.now()}`,
      },
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[Email] 生成邮件草稿失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "生成邮件草稿失败",
      executionTimeMs: Date.now() - startTime,
    };
  }
});

/**
 * 注册邮件草稿 Tool
 */
export function registerEmailDraftTools() {
  toolRegistry.register(emailDraftTool, emailDraftExecutor);
  console.log("[Email] 已注册邮件草稿 Tool:", emailDraftTool.id);
}

// 自动注册
if (typeof window === "undefined") {
  registerEmailDraftTools();
}