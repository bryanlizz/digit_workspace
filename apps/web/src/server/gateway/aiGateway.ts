import { env } from "~/env";
import { ServerKeyStore } from "./keyStore";
import { CircuitBreaker, CircuitState } from "./circuitBreaker";

export type AIProvider = "openai" | "anthropic" | "deepseek";
export type AIRoutingMode = "direct" | "relay";

export interface KeyConfig {
  id: string;
  provider: AIProvider;
  key: string;
  label: string;
  isActive: boolean;
  quota: { monthlyLimit: number; used: number; remaining: number };
  rateLimit: { rpm: number; current: number; resetAt: number };
}

export interface UsageStat {
  provider: string;
  totalCalls: number;
  totalTokens: number;
  activeKeys: number;
}

export interface CompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  provider?: AIProvider;
  model?: string;
  messages: CompletionMessage[];
  maxTokens?: number;
  temperature?: number;
  responseFormat?: { type: "json_object" };
}

export interface CompletionStreamOptions extends CompletionOptions {
  signal?: AbortSignal;
}

export interface CompletionResult {
  content: string;
  model: string;
  tokensUsed: number;
  keyId?: string;
}

export interface EmbeddingOptions {
  provider?: AIProvider;
  model?: string;
}

export interface RoutingStatus {
  mode: AIRoutingMode;
  relayUrl: string;
  defaultProvider: AIProvider;
  defaultModel: string;
  publicRelayUrl: string;
}

export interface HealthStatus {
  ok: boolean;
  mode: AIRoutingMode;
  directConfigured: boolean;
  relayConfigured: boolean;
  relayUrlConfigured: boolean;
  relayPublicUrlConfigured: boolean;
  relayAuthConfigured: boolean;
  relayRetryAttempts: number;
  supportsStreaming: boolean;
  issues: string[];
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { total_tokens?: number };
  error?: { message?: string };
}

interface OpenAIEmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
  error?: { message?: string };
}

const DEFAULT_MODEL_BY_PROVIDER: Record<AIProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
  deepseek: "deepseek-chat",
};

const RELAY_RETRY_ATTEMPTS = 3;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

export class AIGateway {
  private keys: KeyConfig[] = [];
  private keyStore = new ServerKeyStore();
  private relayBreaker = new CircuitBreaker(5, 30_000);

  constructor() {
    void this.loadKeys();
  }

  async loadKeys(): Promise<void> {
    try {
      this.keys = await this.keyStore.loadKeys();
    } catch {
      // keep in-memory keys on failure
    }
  }

  async registerKey(provider: string, key: string, label: string): Promise<void> {
    const keyConfig: KeyConfig = {
      id: crypto.randomUUID(),
      provider: provider as AIProvider,
      key,
      label,
      isActive: true,
      quota: { monthlyLimit: 100000, used: 0, remaining: 100000 },
      rateLimit: { rpm: 60, current: 0, resetAt: Date.now() + 60000 },
    };
    this.keys.push(keyConfig);
    void this.keyStore.saveKey(keyConfig);
  }

  listKeys(): KeyConfig[] {
    return [...this.keys];
  }

  async deleteKey(id: string): Promise<void> {
    this.keys = this.keys.filter((k) => k.id !== id);
    void this.keyStore.deleteKey(id);
  }

  async toggleKey(id: string): Promise<void> {
    const key = this.keys.find((k) => k.id === id);
    if (key) {
      key.isActive = !key.isActive;
      void this.keyStore.saveKey(key);
    }
  }

  getAvailableKey(provider: string): KeyConfig | null {
    const pool = this.keys.filter((k) => k.provider === provider && k.isActive && k.quota.remaining > 0);
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)]!;
  }

  recordCall(keyId: string, tokens: number): void {
    const key = this.keys.find((k) => k.id === keyId);
    if (key) {
      key.quota.used += tokens;
      key.quota.remaining = Math.max(0, key.quota.monthlyLimit - key.quota.used);
      key.rateLimit.current++;
      if (Date.now() > key.rateLimit.resetAt) {
        key.rateLimit.current = 0;
        key.rateLimit.resetAt = Date.now() + 60000;
      }
      void this.keyStore.saveKey(key);
    }
  }

  isRateLimited(keyId: string): boolean {
    const key = this.keys.find((k) => k.id === keyId);
    if (!key) return true;
    return key.rateLimit.current >= key.rateLimit.rpm;
  }

  getRoutingStatus(): RoutingStatus {
    return {
      mode: this.getRoutingMode(),
      relayUrl: this.getRelayUrl(),
      defaultProvider: this.getDefaultProvider(),
      defaultModel: this.getDefaultModel(),
      publicRelayUrl: env.NEXT_PUBLIC_AI_RELAY_URL ?? "",
    };
  }

  getHealthStatus(): HealthStatus {
    const status = this.getRoutingStatus();
    const issues: string[] = [];

    if (status.mode === "relay") {
      if (!status.relayUrl) {
        issues.push("未配置 AI_RELAY_URL");
      }
      if (!status.publicRelayUrl && !env.AI_RELAY_URL) {
        issues.push("未配置可公开读取的 relay 地址");
      }
    } else if (!this.getDirectOpenAIKey()) {
      issues.push("未配置可用的 OpenAI API Key");
    }

    return {
      ok: issues.length === 0,
      mode: status.mode,
      directConfigured: Boolean(this.getDirectOpenAIKey()),
      relayConfigured: Boolean(status.relayUrl),
      relayUrlConfigured: Boolean(status.relayUrl),
      relayPublicUrlConfigured: Boolean(status.publicRelayUrl),
      relayAuthConfigured: Boolean(env.AI_RELAY_API_KEY),
      relayRetryAttempts: RELAY_RETRY_ATTEMPTS,
      supportsStreaming: true,
      issues,
    };
  }

  canUseRealAI(): boolean {
    const status = this.getRoutingStatus();
    if (status.mode === "relay") {
      return Boolean(status.relayUrl);
    }
    return Boolean(this.getDirectOpenAIKey());
  }

  async createCompletion(options: CompletionOptions): Promise<CompletionResult> {
    const provider = options.provider ?? this.getDefaultProvider();
    const model = options.model ?? this.getDefaultModel(provider);

    if (this.getRoutingMode() === "relay") {
      return this.requestViaRelay("/v1/chat/completions", {
        model,
        provider,
        messages: options.messages,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.2,
        response_format: options.responseFormat,
      });
    }

    if (provider !== "openai") {
      throw new Error(`暂不支持的 AI Provider: ${provider}`);
    }

    const apiKey = this.getDirectOpenAIKey();
    if (!apiKey) {
      throw new Error("没有可用的 OpenAI API Key");
    }

    return this.requestOpenAIChat(apiKey, model, options);
  }

  async createEmbedding(text: string, options: EmbeddingOptions = {}): Promise<number[] | null> {
    const provider = options.provider ?? this.getDefaultProvider();
    const model = options.model ?? "text-embedding-3-small";

    if (this.getRoutingMode() === "relay") {
      const result = await this.requestViaRelay("/v1/embeddings", {
        model,
        provider,
        input: text,
      });
      return result.content ? JSON.parse(result.content).data?.[0]?.embedding ?? null : null;
    }

    if (provider !== "openai") {
      throw new Error(`暂不支持的 AI Provider: ${provider}`);
    }

    const apiKey = this.getDirectOpenAIKey();
    if (!apiKey) {
      throw new Error("没有可用的 OpenAI API Key");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
    });

    const data = (await response.json()) as OpenAIEmbeddingResponse;
    if (!response.ok) {
      throw new Error(data.error?.message ?? `OpenAI Embedding 请求失败: ${response.status}`);
    }

    return data.data?.[0]?.embedding ?? null;
  }

  getUsageStats(): UsageStat[] {
    const stats = new Map<string, { calls: number; tokens: number; keys: Set<string> }>();
    this.keys.forEach((k) => {
      const s = stats.get(k.provider) ?? { calls: 0, tokens: 0, keys: new Set() };
      s.keys.add(k.id);
      s.tokens += k.quota.used;
      stats.set(k.provider, s);
    });
    return Array.from(stats, ([provider, data]) => ({
      provider,
      totalCalls: data.keys.size,
      totalTokens: data.tokens,
      activeKeys: data.keys.size,
    }));
  }

  private getRoutingMode(): AIRoutingMode {
    return (env.NEXT_PUBLIC_AI_ROUTING_MODE ?? env.AI_ROUTING_MODE ?? "direct") as AIRoutingMode;
  }

  private getRelayUrl(): string {
    return trimTrailingSlash(env.AI_RELAY_URL ?? env.NEXT_PUBLIC_AI_RELAY_URL ?? "");
  }

  private getDefaultProvider(): AIProvider {
    const provider = (env.NEXT_PUBLIC_AI_DEFAULT_PROVIDER ?? env.AI_DEFAULT_PROVIDER ?? "openai") as AIProvider;
    return provider;
  }

  private getDefaultModel(provider: AIProvider = this.getDefaultProvider()): string {
    return env.NEXT_PUBLIC_AI_DEFAULT_MODEL ?? env.AI_DEFAULT_MODEL ?? DEFAULT_MODEL_BY_PROVIDER[provider] ?? DEFAULT_MODEL_BY_PROVIDER.openai;
  }

  private getDirectOpenAIKey(): string | null {
    const keyConfig = this.getAvailableKey("openai");
    return keyConfig?.key ?? env.OPENAI_API_KEY ?? null;
  }

  private async requestOpenAIChat(apiKey: string, model: string, options: CompletionOptions): Promise<CompletionResult> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.2,
        ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
      }),
    });

    const data = (await response.json()) as OpenAIChatResponse;
    if (!response.ok) {
      throw new Error(data.error?.message ?? `OpenAI API 请求失败: ${response.status}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI API 未返回内容");
    }

    return {
      content,
      model,
      tokensUsed: data.usage?.total_tokens ?? 0,
    };
  }

  private async requestViaRelay(endpoint: string, body: Record<string, unknown>): Promise<CompletionResult> {
    const relayUrl = this.getRelayUrl();
    if (!relayUrl) {
      throw new Error("未配置模型中转站地址");
    }

    const relayKey = env.AI_RELAY_API_KEY ?? "";
    const response = await this.fetchRelay(`${relayUrl}${endpoint}`, {
      method: "POST",
      headers: {
        ...(relayKey ? { Authorization: `Bearer ${relayKey}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as OpenAIChatResponse & OpenAIEmbeddingResponse;
    if (!response.ok) {
      throw new Error(data.error?.message ?? `Relay 请求失败: ${response.status}`);
    }

    if (endpoint === "/v1/chat/completions") {
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Relay 未返回内容");
      }

      return {
        content,
        model: String(body.model ?? this.getDefaultModel()),
        tokensUsed: data.usage?.total_tokens ?? 0,
      };
    }

    if (endpoint === "/v1/embeddings") {
      const embedding = data.data?.[0]?.embedding;
      if (!embedding) {
        throw new Error("Relay 未返回 embedding");
      }

      return {
        content: JSON.stringify({ data: [{ embedding }] }),
        model: String(body.model ?? "text-embedding-3-small"),
        tokensUsed: 0,
      };
    }

    throw new Error(`不支持的 Relay 端点: ${endpoint}`);
  }

  private async fetchRelay(url: string, init: RequestInit): Promise<Response> {
    return this.relayBreaker.call(async () => {
      for (let attempt = 1; attempt <= RELAY_RETRY_ATTEMPTS; attempt++) {
        try {
          const response = await fetch(url, init);
          if (response.ok) return response;
          if (response.status < 500 || attempt === RELAY_RETRY_ATTEMPTS) {
            return response;
          }
        } catch (error) {
          if (attempt === RELAY_RETRY_ATTEMPTS) {
            throw error;
          }
        }
        // 指数退避
        await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, attempt - 1), 10000)));
      }
      throw new Error("Relay 请求失败");
    });
  }
}

export const aiGateway = new AIGateway();
