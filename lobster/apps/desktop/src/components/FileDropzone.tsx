// ─────────────────────────────────────────────────────────
// 数智企业 · Desktop 文件拖拽上传组件
// ─────────────────────────────────────────────────────────

import { useState, useCallback, type DragEvent, type ChangeEvent } from "react";
import { Upload, X, FileText } from "lucide-react";

export interface UploadedFile {
  filename: string;
  savedName: string;
  size: number;
  mimeType: string;
  url: string;
}

interface FileDropzoneProps {
  onUploadComplete: (files: UploadedFile[]) => void;
  accept?: string;
  multiple?: boolean;
  compact?: boolean;
}

function getApiBaseUrl(): string {
  return localStorage.getItem("lobster_api_url") ?? "http://localhost:3000";
}

export function FileDropzone({
  onUploadComplete,
  accept,
  multiple = false,
  compact = false,
}: FileDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      setError(null);
      try {
        const formData = new FormData();
        for (const file of files) {
          formData.append("files", file);
        }

        const resp = await fetch(`${getApiBaseUrl()}/api/upload`, {
          method: "POST",
          body: formData,
        });
        const data = (await resp.json()) as { success: boolean; files: UploadedFile[]; error?: string };
        if (data.success && data.files.length > 0) {
          onUploadComplete(data.files);
        } else {
          setError(data.error ?? "上传失败");
        }
      } catch (err) {
        console.error("Upload failed:", err);
        setError("上传失败，请检查网络连接");
      } finally {
        setUploading(false);
        setDragOver(false);
      }
    },
    [onUploadComplete],
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

  const paddingClass = compact ? "p-4" : "p-8";
  const iconSize = compact ? "h-5 w-5" : "h-8 w-8";

  return (
    <div>
      <div
        className={`relative rounded-lg border-2 border-dashed text-center transition-colors ${paddingClass} ${
          dragOver ? "border-rose-400 bg-rose-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
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
            <div className="text-rose-600">
              <div className={`mx-auto mb-3 ${iconSize} animate-spin rounded-full border-2 border-rose-600 border-t-transparent`} />
              <p className="text-sm font-medium">上传中...</p>
            </div>
          ) : (
            <div className="text-gray-500">
              <Upload className={`mx-auto mb-3 ${iconSize}`} />
              <p className="text-sm font-medium">拖拽文件到此处或点击选择</p>
              <p className="mt-1 text-xs text-gray-400">支持文档、PDF、图片等格式，不超过 10MB</p>
            </div>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** 已上传文件列表 */
export function FileChip({
  file,
  onRemove,
}: {
  file: UploadedFile;
  onRemove?: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-sm">
      <FileText className="h-3.5 w-3.5 flex-shrink-0 text-rose-500" />
      <span className="max-w-[120px] truncate text-gray-700">{file.filename}</span>
      <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 rounded-full p-0.5 text-gray-400 hover:bg-rose-100 hover:text-rose-600"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
