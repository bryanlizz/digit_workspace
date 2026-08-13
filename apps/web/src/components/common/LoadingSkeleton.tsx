// ─────────────────────────────────────────────────────────
// 数智企业 · Loading 骨架屏
// ─────────────────────────────────────────────────────────

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3 p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="h-3 w-2/3 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border border-gray-200 p-4">
          <div className="mb-3 h-4 w-2/3 rounded bg-gray-200" />
          <div className="mb-2 h-3 w-full rounded bg-gray-100" />
          <div className="mb-4 h-3 w-1/2 rounded bg-gray-100" />
          <div className="h-8 w-24 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
