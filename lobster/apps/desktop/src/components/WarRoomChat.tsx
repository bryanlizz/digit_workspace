// ─────────────────────────────────────────────────────────
// 数智企业 · Desktop 作战室聊天组件
// ─────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, X, FileText, Image, Download } from "lucide-react";
import { FileDropzone, FileChip, type UploadedFile } from "./FileDropzone";
import { useWarRoomStore } from "../stores/warRoomStore";

// ─── 发送者信息 ─────────────────────────────────────────

function getSenderInfo() {
  return {
    senderId: localStorage.getItem("lobster_user_id") ?? "desktop-user",
    senderName: localStorage.getItem("lobster_user_name") ?? "我",
    senderType: "human" as const,
  };
}

function getApiBaseUrl(): string {
  return localStorage.getItem("lobster_api_url") ?? "http://localhost:3000";
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── 文件消息气泡 ──────────────────────────────────────

function FileMessageBubble({ msg }: { msg: ReturnType<typeof useWarRoomStore.getState>["messages"][number] }) {
  const files = msg.metadata?.files as Array<{ filename: string; size: number; mimeType: string; url: string }> | undefined;

  if (!files || files.length === 0) {
    return <span className="text-gray-600">{msg.content}</span>;
  }

  const isImage = (mime: string) => mime.startsWith("image/");

  return (
    <div className="space-y-2">
      {msg.content && msg.content !== files.map((f) => f.filename).join(", ") && (
        <p className="text-gray-700">{msg.content}</p>
      )}
      <div className="space-y-2">
        {files.map((file, i) => (
          <div key={i}>
            {isImage(file.mimeType) ? (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <img
                  src={file.url}
                  alt={file.filename}
                  className="max-h-48 w-auto object-cover"
                />
                <div className="flex items-center justify-between bg-gray-50 px-3 py-1.5 text-xs">
                  <span className="truncate text-gray-600">{file.filename}</span>
                  <span className="text-gray-400">{formatSize(file.size)}</span>
                </div>
              </div>
            ) : (
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100"
              >
                <FileText className="h-8 w-8 flex-shrink-0 text-rose-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{file.filename}</p>
                  <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                </div>
                <Download className="h-4 w-4 flex-shrink-0 text-gray-400" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 消息气泡 ──────────────────────────────────────────

function MessageBubble({ msg, isOwn }: { msg: ReturnType<typeof useWarRoomStore.getState>["messages"][number]; isOwn: boolean }) {
  return (
    <div className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm">
        {msg.avatar}
      </div>
      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">{msg.senderName}</span>
          <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
        </div>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isOwn
              ? "rounded-tr-md bg-rose-500 text-white"
              : "rounded-tl-md bg-gray-100 text-gray-800"
          }`}
        >
          {msg.messageType === "file" || msg.messageType === "image" ? (
            <FileMessageBubble msg={msg} />
          ) : (
            <span className="whitespace-pre-wrap break-words">{msg.content}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 主组件 ────────────────────────────────────────────

export function WarRoomChat() {
  const messages = useWarRoomStore((s) => s.messages);
  const isLoadingMessages = useWarRoomStore((s) => s.isLoadingMessages);
  const sendMessage = useWarRoomStore((s) => s.sendMessage);
  const sendFileMessage = useWarRoomStore((s) => s.sendFileMessage);

  const [input, setInput] = useState("");
  const [showDropzone, setShowDropzone] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // 回车发送
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [input, attachedFiles],
  );

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content && attachedFiles.length === 0) return;
    if (sending) return;

    setSending(true);
    const senderInfo = getSenderInfo();

    try {
      if (attachedFiles.length > 0) {
        await sendFileMessage(attachedFiles, content, senderInfo);
        setAttachedFiles([]);
        setShowDropzone(false);
      } else {
        await sendMessage(content, senderInfo);
      }
      setInput("");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, attachedFiles, sending, sendMessage, sendFileMessage]);

  const handleUploadComplete = useCallback((files: UploadedFile[]) => {
    setAttachedFiles((prev) => [...prev, ...files]);
    setShowDropzone(false);
  }, []);

  const removeAttachment = useCallback((savedName: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.savedName !== savedName));
  }, []);

  const senderInfo = getSenderInfo();
  const currentUserId = senderInfo.senderId;

  return (
    <div className="flex h-[calc(100vh-13rem)] flex-col rounded-lg border border-gray-200 bg-white">
      {/* 消息列表 */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4">
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-sm text-gray-400">加载消息中...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-gray-400">暂无消息</p>
              <p className="mt-1 text-xs text-gray-300">在下方输入框开始协作吧</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isOwn={msg.senderType === "human" && msg.senderId === currentUserId}
              />
            ))}
          </div>
        )}
      </div>

      {/* 附件预览 */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-2">
          {attachedFiles.map((file) => (
            <FileChip
              key={file.savedName}
              file={file}
              onRemove={() => removeAttachment(file.savedName)}
            />
          ))}
        </div>
      )}

      {/* 上传区域 */}
      {showDropzone && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">上传文件</span>
            <button
              onClick={() => setShowDropzone(false)}
              className="rounded p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <FileDropzone
            onUploadComplete={handleUploadComplete}
            multiple
            compact
          />
        </div>
      )}

      {/* 输入区域 */}
      <div className="flex items-end gap-2 border-t border-gray-100 p-3">
        <button
          onClick={() => setShowDropzone(!showDropzone)}
          className={`flex-shrink-0 rounded-lg p-2 transition-colors ${
            showDropzone
              ? "bg-rose-50 text-rose-600"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
          title="添加附件"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-rose-300"
        />

        <button
          onClick={() => { void handleSend(); }}
          disabled={sending || (!input.trim() && attachedFiles.length === 0)}
          className="flex-shrink-0 rounded-lg bg-rose-500 p-2 text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
          title="发送"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
