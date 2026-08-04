// ─────────────────────────────────────────────────────────
// 数智企业 · 文件上传 API
// POST /api/upload — multipart 文件上传
// ─────────────────────────────────────────────────────────

import type { NextApiRequest, NextApiResponse } from "next";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = join(process.cwd(), "uploads");
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const config = {
  api: {
    bodyParser: false, // disable default body parser for multipart
  },
};

interface ParsedFile {
  filename: string;
  mimeType: string;
  data: Buffer;
  size: number;
}

/**
 * Simple multipart parser for Next.js API Routes
 * Parses `multipart/form-data` into fields and files
 */
function parseMultipart(buffer: Buffer, boundary: string): { fields: Record<string, string>; files: ParsedFile[] } {
  const fields: Record<string, string> = {};
  const files: ParsedFile[] = [];

  const boundaryStr = `--${boundary}`;
  const parts = buffer.toString("binary").split(boundaryStr);

  for (const part of parts) {
    if (part === "--\r\n" || part === "--" || !part.includes("Content-Disposition")) continue;

    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headers = part.slice(0, headerEnd);
    const body = part.slice(headerEnd + 4, part.endsWith("\r\n") ? part.length - 2 : part.length);

    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const mimeMatch = headers.match(/Content-Type:\s*(.+)/i);

    if (!nameMatch) continue;

    if (filenameMatch) {
      const buf = Buffer.from(body, "binary");
      files.push({
        filename: filenameMatch[1] ?? "unnamed",
        mimeType: mimeMatch?.[1]?.trim() ?? "application/octet-stream",
        data: buf,
        size: buf.length,
      });
    } else {
      fields[nameMatch[1]!] = body.trim();
    }
  }

  return { fields, files };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const contentType = req.headers["content-type"] ?? "";
  const boundaryMatch = contentType.match(/boundary=(.+)/);
  if (!boundaryMatch) {
    return res.status(400).json({ error: "需要 multipart/form-data" });
  }

  try {
    // Read raw body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    const { files } = parseMultipart(buffer, boundaryMatch[1]!);

    if (files.length === 0) {
      return res.status(400).json({ error: "未找到上传文件" });
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    const results = [];
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        results.push({ filename: file.filename, error: "文件超过 10MB 限制" });
        continue;
      }

      const ext = file.filename.split(".").pop() ?? "bin";
      const savedName = `${randomUUID()}.${ext}`;
      const filePath = join(UPLOAD_DIR, savedName);

      await writeFile(filePath, file.data);

      results.push({
        filename: file.filename,
        savedName,
        size: file.size,
        mimeType: file.mimeType,
        url: `/uploads/${savedName}`,
      });
    }

    res.status(200).json({ success: true, files: results });
  } catch (error) {
    console.error("[Upload] Error:", error);
    res.status(500).json({ error: "上传处理失败" });
  }
}
