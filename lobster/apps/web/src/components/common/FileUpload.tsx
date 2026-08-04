// ─────────────────────────────────────────────────────────
// 数智企业 · 文件上传组件
// 支持拖拽上传和点击选择
// ─────────────────────────────────────────────────────────

import { useState, useCallback, type DragEvent, type ChangeEvent } from "react";
import { Upload, X, FileText } from "lucide-react";

interface UploadedFile {
  filename: string;
  savedName: string;
  size: number;
  mimeType: string;
  url: string;
}

interface FileUploadProps {
  onUpload: (files: UploadedFile[]) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
}

export function FileUpload({ onUpload, accept, multiple = false }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      try {
        const formData = new FormData();
        for (const file of files) {
          formData.append("files", file);
        }

        const resp = await fetch("/api/upload", { method: "POST", body: formData });
        const data = (await resp.json()) as { success: boolean; files: UploadedFile[] };
        if (data.success) {
          onUpload(data.files);
        }
      } catch (error) {
        console.error("Upload failed:", error);
      } finally {
        setUploading(false);
        setDragOver(false);
      }
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadFiles(e.target.files);
      }
    },
    [uploadFiles],
  );

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      <div className="pointer-events-none">
        {uploading ? (
          <div className="text-blue-600">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm font-medium">上传中...</p>
          </div>
        ) : (
          <div className="text-gray-500">
            <Upload className="mx-auto mb-3 h-8 w-8" />
            <p className="text-sm font-medium">拖拽文件到此处或点击选择</p>
            <p className="mt-1 text-xs text-gray-400">支持图片、文档、PDF 等格式</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** 已上传文件列表展示 */
export function FileList({ files, onRemove }: { files: UploadedFile[]; onRemove?: (name: string) => void }) {
  if (files.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2">
      {files.map((f) => (
        <li key={f.savedName} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <span className="flex-1 truncate">{f.filename}</span>
          <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(1)} KB</span>
          {onRemove && (
            <button onClick={() => onRemove(f.savedName)} className="text-gray-400 hover:text-red-500">
              <X className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
