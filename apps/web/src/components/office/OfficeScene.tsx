import dynamic from "next/dynamic";
import { useAppStore } from "~/stores/appStore";

// 动态加载 Three.js 场景（减少首屏体积）
const OfficeSceneInner = dynamic(
  () => import("./OfficeSceneInner").then((mod) => ({ default: mod.OfficeSceneInner })),
  { ssr: false, loading: () => <OfficeSceneFallback /> }
);

const TourModeInner = dynamic(
  () => import("./TourMode").then((mod) => ({ default: mod.TourMode })),
  { ssr: false }
);

/** 3D 场景加载时的占位 */
function OfficeSceneFallback() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-blue-200" />
        <p className="text-sm text-gray-400">加载 3D 办公室...</p>
      </div>
    </div>
  );
}

/** 3D 场景主入口 */
export const OfficeScene = () => {
  const tourMode = useAppStore((s) => s.tourMode);

  return (
    <div className="relative h-full w-full">
      <OfficeSceneInner />
      {tourMode && <TourModeInner />}
    </div>
  );
};
