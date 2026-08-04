// ─────────────────────────────────────────────────────────
// 数智企业 · SMS 短信 Connector
// 支持阿里云/腾讯云短信发送
// ─────────────────────────────────────────────────────────

import { env } from "~/env";
import type { ToolDefinition, ToolCallResult, ToolCallContext, IToolExecutor } from "~/server/tools/types";
import { toolRegistry } from "../toolRegistry";

export const smsSendTool: ToolDefinition = {
  id: "sms.send",
  name: "发送短信",
  description: "通过云短信平台发送短信",
  systemType: "sms",
  requiredLevel: 3,
  requiresApproval: true,
  parameters: [
    { name: "phone", type: "string", description: "手机号", required: true },
    { name: "content", type: "string", description: "短信内容", required: true },
    { name: "signName", type: "string", description: "短信签名", required: false },
  ],
};

class SmsExecutor implements IToolExecutor {
  async execute(_def: ToolDefinition, params: Record<string, unknown>, _ctx: ToolCallContext): Promise<ToolCallResult> {
    const startTime = Date.now();
    try {
      const provider = env.SMS_PROVIDER ?? "aliyun";
      const phone = String(params.phone ?? "");
      const content = String(params.content ?? "");
      const signName = params.signName ? String(params.signName) : "数智企业";

      if (!phone) return { success: false, error: "手机号为空", executionTimeMs: 0 };

      switch (provider) {
        case "aliyun":
          return await this.sendAlibaba(phone, content, signName, startTime);
        case "tencent":
          return await this.sendTencent(phone, content, signName, startTime);
        default:
          // Mock mode for development
          console.log(`[SMS Mock] To: ${phone}, Content: ${content}`);
          return {
            success: true,
            data: { provider: "mock", phone, sent: true, messageId: `sms-${Date.now()}` },
            executionTimeMs: Date.now() - startTime,
            startedAt: new Date(startTime),
            completedAt: new Date(),
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "短信发送失败",
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  private async sendAlibaba(phone: string, content: string, signName: string, startTime: number): Promise<ToolCallResult> {
    const key = env.SMS_ACCESS_KEY;
    const secret = env.SMS_ACCESS_SECRET;
    if (!key || !secret) return { success: false, error: "SMS 凭证未配置", executionTimeMs: 0 };

    // Alibaba Cloud SMS API
    const resp = await fetch("https://dysmsapi.aliyuncs.com/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        AccessKeyId: key,
        Signature: secret,
        Action: "SendSms",
        PhoneNumbers: phone,
        SignName: signName,
        TemplateParam: JSON.stringify({ content }),
        Format: "JSON",
        Version: "2017-05-25",
      }),
    });

    const data = await resp.json() as Record<string, unknown>;
    return {
      success: (data.Code as string) === "OK",
      data: { provider: "aliyun", messageId: data.BizId },
      executionTimeMs: Date.now() - startTime,
    };
  }

  private async sendTencent(phone: string, content: string, signName: string, startTime: number): Promise<ToolCallResult> {
    const key = env.SMS_ACCESS_KEY;
    if (!key) return { success: false, error: "SMS 凭证未配置", executionTimeMs: 0 };

    const resp = await fetch("https://sms.tencentcloudapi.com/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Action: "SendSms",
        PhoneNumberSet: [`+86${phone}`],
        SignName: signName,
        TemplateParamSet: [content],
      }),
    });

    const data = await resp.json() as Record<string, unknown>;
    return {
      success: data.Response !== undefined,
      data: { provider: "tencent", messageId: (data.Response as Record<string, unknown>)?.RequestId },
      executionTimeMs: Date.now() - startTime,
    };
  }

  validate(params: unknown, _def: ToolDefinition): boolean {
    if (typeof params !== "object" || params === null) return false;
    const p = params as Record<string, unknown>;
    return typeof p.phone === "string" && p.phone.length > 0;
  }
}

toolRegistry.register(smsSendTool, new SmsExecutor());
