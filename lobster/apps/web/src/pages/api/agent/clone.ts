// 数智企业 · Agent 克隆 API
import type { NextApiRequest, NextApiResponse } from "next";
import { cloneAgent } from "~/server/agent/cloneAgent";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { sourceAgentId, name } = req.body as { sourceAgentId: string; name?: string };
    const cloned = await cloneAgent(sourceAgentId, name);
    res.status(200).json({ success: true, agent: cloned });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "克隆失败" });
  }
}
