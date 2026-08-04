import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().min(1),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DEPLOYMENT_MODE: z.enum(["local", "private", "enterprise"]).default("local"),
    AUTH_MODE: z.enum(["local", "sso", "hybrid"]).default("local"),
    WORKER_URL: z.string().url().optional(),
    LDAP_URL: z.string().url().optional(),
    LDAP_BIND_DN: z.string().optional(),
    LDAP_BIND_PASSWORD: z.string().optional(),
    SSO_ISSUER: z.string().url().optional(),
    SSO_CLIENT_ID: z.string().optional(),
    SSO_CLIENT_SECRET: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    AI_ROUTING_MODE: z.enum(["direct", "relay"]).default("direct"),
    AI_RELAY_URL: z.string().url().optional(),
    AI_RELAY_API_KEY: z.string().optional(),
    AI_DEFAULT_PROVIDER: z.enum(["openai", "anthropic", "deepseek"]).default("openai"),
    AI_DEFAULT_MODEL: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_SECURE: z.coerce.boolean().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    IMAP_HOST: z.string().optional(),
    IMAP_PORT: z.coerce.number().optional(),
    IMAP_USER: z.string().optional(),
    IMAP_PASS: z.string().optional(),
    SMS_PROVIDER: z.enum(["aliyun", "tencent", "mock"]).default("mock"),
    SMS_ACCESS_KEY: z.string().optional(),
    SMS_ACCESS_SECRET: z.string().optional(),
    FEISHU_WEBHOOK_URL: z.string().url().optional(),
    FEISHU_APP_ID: z.string().optional(),
    FEISHU_APP_SECRET: z.string().optional(),
    FEISHU_APP_TOKEN: z.string().optional(),
    NOTIFY_WEBHOOK_URL: z.string().url().optional(),
    BROWSER_DRIVER: z.enum(["fetch", "playwright"]).default("fetch"),
  },

  /**
   * Specify your client-side environment variables schema here. To expose them to the client,
   * prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_DEPLOYMENT_MODE: z.enum(["local", "private", "enterprise"]).default("local"),
    NEXT_PUBLIC_AUTH_MODE: z.enum(["local", "sso", "hybrid"]).default("local"),
    NEXT_PUBLIC_WORKER_URL: z.string().url().optional(),
    NEXT_PUBLIC_AI_ROUTING_MODE: z.enum(["direct", "relay"]).default("direct"),
    NEXT_PUBLIC_AI_RELAY_URL: z.string().url().optional(),
    NEXT_PUBLIC_AI_DEFAULT_PROVIDER: z.enum(["openai", "anthropic", "deepseek"]).default("openai"),
    NEXT_PUBLIC_AI_DEFAULT_MODEL: z.string().optional(),
    NEXT_PUBLIC_APP_MODE: z.enum(["web", "admin", "enterprise", "desktop"]).default("web"),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE,
    AUTH_MODE: process.env.AUTH_MODE,
    WORKER_URL: process.env.WORKER_URL,
    LDAP_URL: process.env.LDAP_URL,
    LDAP_BIND_DN: process.env.LDAP_BIND_DN,
    LDAP_BIND_PASSWORD: process.env.LDAP_BIND_PASSWORD,
    SSO_ISSUER: process.env.SSO_ISSUER,
    SSO_CLIENT_ID: process.env.SSO_CLIENT_ID,
    SSO_CLIENT_SECRET: process.env.SSO_CLIENT_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AI_ROUTING_MODE: process.env.AI_ROUTING_MODE,
    AI_RELAY_URL: process.env.AI_RELAY_URL,
    AI_RELAY_API_KEY: process.env.AI_RELAY_API_KEY,
    AI_DEFAULT_PROVIDER: process.env.AI_DEFAULT_PROVIDER,
    AI_DEFAULT_MODEL: process.env.AI_DEFAULT_MODEL,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    IMAP_HOST: process.env.IMAP_HOST,
    IMAP_PORT: process.env.IMAP_PORT,
    IMAP_USER: process.env.IMAP_USER,
    IMAP_PASS: process.env.IMAP_PASS,
    SMS_PROVIDER: process.env.SMS_PROVIDER,
    SMS_ACCESS_KEY: process.env.SMS_ACCESS_KEY,
    SMS_ACCESS_SECRET: process.env.SMS_ACCESS_SECRET,
    FEISHU_WEBHOOK_URL: process.env.FEISHU_WEBHOOK_URL,
    FEISHU_APP_ID: process.env.FEISHU_APP_ID,
    FEISHU_APP_SECRET: process.env.FEISHU_APP_SECRET,
    FEISHU_APP_TOKEN: process.env.FEISHU_APP_TOKEN,
    NOTIFY_WEBHOOK_URL: process.env.NOTIFY_WEBHOOK_URL,
    BROWSER_DRIVER: process.env.BROWSER_DRIVER,
    NEXT_PUBLIC_DEPLOYMENT_MODE: process.env.NEXT_PUBLIC_DEPLOYMENT_MODE,
    NEXT_PUBLIC_AUTH_MODE: process.env.NEXT_PUBLIC_AUTH_MODE,
    NEXT_PUBLIC_WORKER_URL: process.env.NEXT_PUBLIC_WORKER_URL,
    NEXT_PUBLIC_AI_ROUTING_MODE: process.env.NEXT_PUBLIC_AI_ROUTING_MODE,
    NEXT_PUBLIC_AI_RELAY_URL: process.env.NEXT_PUBLIC_AI_RELAY_URL,
    NEXT_PUBLIC_AI_DEFAULT_PROVIDER: process.env.NEXT_PUBLIC_AI_DEFAULT_PROVIDER,
    NEXT_PUBLIC_AI_DEFAULT_MODEL: process.env.NEXT_PUBLIC_AI_DEFAULT_MODEL,
    NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
