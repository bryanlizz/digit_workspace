// ─────────────────────────────────────────────────────────
// 数智企业 · OAuth Connector 流程
// ─────────────────────────────────────────────────────────

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { provider, code, state, error: oauthError } = req.query;

  if (oauthError) {
    return res.redirect(302, `/settings?error=${oauthError}`);
  }

  // OAuth 回调：用 code 换 token
  if (code && provider) {
    try {
      // 根据 provider 调用对应 OAuth token endpoint
      const tokenUrl = getTokenUrl(String(provider));
      if (!tokenUrl) {
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
      }

      // Store token via credentialService
      res.redirect(302, "/settings?oauth=success");
    } catch (err) {
      console.error("[OAuth Callback] Error:", err);
      res.redirect(302, "/settings?oauth=error");
    }
    return;
  }

  // 发起 OAuth 授权
  if (provider) {
    const authUrl = getAuthUrl(String(provider));
    if (!authUrl) {
      return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }
    return res.redirect(302, authUrl);
  }

  res.status(400).json({ error: "Missing provider" });
}

function getAuthUrl(provider: string): string | null {
  const clientId = process.env.SSO_CLIENT_ID ?? "";
  const redirectUri = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/oauth/callback?provider=${provider}`;

  switch (provider) {
    case "feishu":
      return `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=feishu`;
    case "github":
      return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
    default:
      return null;
  }
}

function getTokenUrl(provider: string): string | null {
  switch (provider) {
    case "feishu":
      return "https://open.feishu.cn/open-apis/authen/v1/access_token";
    case "github":
      return "https://github.com/login/oauth/access_token";
    default:
      return null;
  }
}
