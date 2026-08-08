// ─────────────────────────────────────────────────────────
// 数智企业 · 审计日志 tRPC Router
// ─────────────────────────────────────────────────────────

import { z } from "zod";
import { jsPDF } from "jspdf";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { auditRepo } from "~/lib/repository";

const auditFilterSchema = z.object({
  tenantId: z.string().optional(),
  agentId: z.string().optional(),
  employeeId: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const auditRouter = createTRPCRouter({
  /** 获取审计日志列表（支持筛选） */
  list: protectedProcedure
    .input(auditFilterSchema.optional())
    .query(async ({ input }) => {
      return auditRepo.findMany(input);
    }),

  /** 获取最近活动时间线 */
  getRecentActivity: protectedProcedure
    .input(z.object({ limit: z.number().int().default(20) }).optional())
    .query(async ({ input }) => {
      return auditRepo.findMany({ limit: input?.limit });
    }),

  /** 获取任务责任链 */
  getResponsibilityChain: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      return auditRepo.getResponsibilityChain(input.taskId);
    }),

  /** 获取任务回放 */
  getTaskReplay: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      return auditRepo.getTaskReplay(input.taskId);
    }),

  /** 获取审计统计 */
  getStats: protectedProcedure.query(async () => {
    return auditRepo.getStats("tenant-default");
  }),

  /** 导出审计日志为 PDF（base64 编码） */
  exportPdf: protectedProcedure.query(async () => {
    const tenantId = "tenant-default";
    const [logs, stats, hashResult] = await Promise.all([
      auditRepo.findMany({ limit: 1000, tenantId }),
      auditRepo.getStats(tenantId),
      (auditRepo as any).verifyHashChain?.(tenantId) as Promise<{
        valid: boolean; total: number; validCount: number; brokenAt: number | null; message: string;
      }> | null,
    ]);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // 标题
    doc.setFontSize(18);
    doc.text("数智企业 · 审计报告", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`导出时间: ${new Date().toLocaleString("zh-CN")}`, pageWidth / 2, 22, { align: "center" });

    // 统计摘要
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("统计摘要", 12, 32);
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text(`总日志数: ${stats.totalLogs}`, 12, 40);
    doc.text(`Hash 链校验: ${hashResult?.message ?? "未校验"}`, 12, 46);

    // 按操作类型统计
    let y = 54;
    const actionEntries = Object.entries(stats.byAction);
    if (actionEntries.length > 0) {
      doc.text("操作分布:", 12, y);
      y += 6;
      for (const [action, count] of actionEntries.slice(0, 10)) {
        doc.text(`  ${action}: ${count}`, 12, y);
        y += 5;
      }
    }

    // 审计日志表格
    y += 6;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("审计日志", 12, y);
    y += 8;

    // 表格头
    doc.setFillColor(240, 240, 240);
    doc.setFontSize(8);
    doc.setTextColor(80);
    const cols = [
      { x: 12, w: 30, title: "时间" },
      { x: 42, w: 35, title: "操作" },
      { x: 77, w: 28, title: "Agent" },
      { x: 105, w: 22, title: "权限级别" },
      { x: 127, w: 50, title: "详情" },
      { x: 177, w: 40, title: "Hash (前12位)" },
    ];
    doc.rect(10, y - 5, pageWidth - 20, 6, "F");
    for (const col of cols) {
      doc.text(col.title, col.x, y - 1);
    }
    y += 3;

    // 表格数据
    doc.setFontSize(7);
    doc.setTextColor(40);
    const rowsPerPage = 30;
    let rowCount = 0;

    for (const log of logs.slice(0, 200)) {
      if (rowCount > 0 && rowCount % rowsPerPage === 0) {
        doc.addPage();
        y = 12;
        // 重复表头
        doc.setFillColor(240, 240, 240);
        doc.rect(10, y - 5, pageWidth - 20, 6, "F");
        for (const col of cols) {
          doc.text(col.title, col.x, y - 1);
        }
        y += 3;
      }

      const timeStr = new Date(log.createdAt).toLocaleString("zh-CN");
      const action = log.action.length > 18 ? log.action.slice(0, 17) + "…" : log.action;
      const agentId = (log.agentId ?? "—").length > 14 ? (log.agentId ?? "—").slice(0, 13) + "…" : (log.agentId ?? "—");
      const detailStr = log.detail ? JSON.stringify(log.detail).slice(0, 40) : "—";
      const hashStr = (log.currentHash ?? "").slice(0, 12);

      doc.text(timeStr, 12, y);
      doc.text(action, 42, y);
      doc.text(agentId, 77, y);
      doc.text(`L${log.permissionLevel}`, 105, y);
      doc.text(detailStr, 127, y);
      doc.text(hashStr, 177, y);

      y += 5;
      rowCount++;
    }

    // 页脚
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`第 ${i} / ${totalPages} 页`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
    }

    const pdfBase64 = doc.output("datauristring");
    return { base64: pdfBase64, filename: `audit-report-${new Date().toISOString().slice(0, 10)}.pdf` };
  }),
  /** 导出审计日志为 CSV 字符串 */
  exportCsv: protectedProcedure
    .input(z.object({ limit: z.number().int().default(1000) }).optional())
    .query(async ({ input }) => {
      const logs = await auditRepo.findMany({ limit: input?.limit ?? 1000, tenantId: "tenant-default" });
      const headers = "id,时间,操作,Agent,权限,Hash\n";
      const rows = logs.map((l) =>
        `${l.id},${l.createdAt},${l.action},${l.agentId ?? ""},L${l.permissionLevel},${(l.currentHash ?? "").slice(0, 12)}`
      ).join("\n");
      return headers + rows;
    }),
});
