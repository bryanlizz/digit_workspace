// 数智企业 · 审计报告导出
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "~/server/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const format = (req.query.format as string) ?? "csv";

    if (format === "csv") {
      const headers = "id,时间,操作,Agent,权限,Hash\n";
      const rows = logs.map((l: any) =>
        `${l.id},${new Date(l.createdAt).toISOString()},${l.action},${l.agentId ?? ""},L${l.permissionLevel},${(l.currentHash ?? "").slice(0, 12)}`
      ).join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=audit-${new Date().toISOString().slice(0, 10)}.csv`);
      return res.status(200).end(headers + "\n" + rows);
    }

    res.status(200).json({ exportedAt: new Date().toISOString(), count: logs.length, logs });
  } catch (error) {
    console.error("[Audit Export]", error);
    res.status(500).json({ error: "导出失败", detail: String(error) });
  }
}
