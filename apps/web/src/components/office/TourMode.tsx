import { useEffect, useMemo, useState, useCallback } from "react";
import { X } from "lucide-react";
import { useAppStore } from "~/stores/appStore";

/** 路演路径点 */
interface TourStop {
  zone: string;
  label: string;
  description: string;
  employees: string[];
  camera: { x: number; y: number; z: number };
}

const TOUR_STOPS: TourStop[] = [
  { zone: "strategy", label: "战略与顶层设计", description: "企业战略规划与决策支持", employees: ["战略规划师", "CEO助理"], camera: { x: -4.8, y: 8.2, z: 10.5 } },
  { zone: "research", label: "行业与研究洞察", description: "市场分析、竞品追踪、行业研究", employees: ["市场分析师", "竞争情报官"], camera: { x: -1.8, y: 8.0, z: 8.8 } },
  { zone: "product", label: "产品与研发管理", description: "产品规划、AI 架构、技术开发", employees: ["产品需求与规划", "AI应用架构师", "技术开发"], camera: { x: 1.2, y: 8.1, z: 10.2 } },
  { zone: "sales", label: "销售与商业化", description: "大客户管理、商务谈判", employees: ["KA大客户经理"], camera: { x: 4.8, y: 7.8, z: 11.2 } },
  { zone: "marketing", label: "市场品牌与传播", description: "品牌建设、内容营销", employees: ["品牌内容与传播"], camera: { x: 5.2, y: 7.9, z: 8.8 } },
  { zone: "finance", label: "财务法务与风控", description: "财务分析、法务审查、风险控制", employees: ["财务分析与预算", "法务合同与风控"], camera: { x: 7.4, y: 8.1, z: 10.8 } },
];

const STOP_DURATION = 4000; // 每个区域停留时间 ms
const EMPLOYEE_HIGHLIGHT_DURATION = 1500; // 每个员工高亮时间 ms
const CAMERA_EASING = 0.14;

export const TourMode = () => {
  const setTourMode = useAppStore((s) => s.setTourMode);
  const setTourCamera = useAppStore((s) => s.setTourCamera);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [currentEmployeeIndex, setCurrentEmployeeIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [cameraPos, setCameraPos] = useState(TOUR_STOPS[0]!.camera);

  const currentStop = TOUR_STOPS[currentStopIndex];
  const totalStops = TOUR_STOPS.length;

  const totalItems = useMemo(() => TOUR_STOPS.reduce((sum, s) => sum + s.employees.length, 0), []);

  const skip = useCallback(() => {
    setTourMode(false);
  }, [setTourMode]);

  useEffect(() => {
    let currentItem = 0;

    const interval = setInterval(() => {
      currentItem++;
      setProgress((currentItem / totalItems) * 100);

      let itemAccum = 0;
      for (let i = 0; i < TOUR_STOPS.length; i++) {
        const stop = TOUR_STOPS[i]!;
        const stopItems = stop.employees.length;
        if (currentItem <= itemAccum + stopItems) {
          setCurrentStopIndex(i);
          setCurrentEmployeeIndex(currentItem - itemAccum - 1);
          setCameraPos(stop.camera);
          break;
        }
        itemAccum += stopItems;
      }

      if (currentItem >= totalItems) {
        clearInterval(interval);
        setTimeout(() => setTourMode(false), 1000);
      }
    }, EMPLOYEE_HIGHLIGHT_DURATION);

    return () => clearInterval(interval);
  }, [setTourMode, totalItems]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(function tick() {
      setCameraPos((prev) => {
        const target = TOUR_STOPS[currentStopIndex]?.camera ?? prev;
        const mix = (from: number, to: number) => from + (to - from) * CAMERA_EASING;
        const next = {
          x: mix(prev.x, target.x),
          y: mix(prev.y, target.y),
          z: mix(prev.z, target.z),
        };
        if (Math.abs(next.x - target.x) < 0.02 && Math.abs(next.y - target.y) < 0.02 && Math.abs(next.z - target.z) < 0.02) {
          return target;
        }
        return next;
      });
      window.requestAnimationFrame(tick);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [currentStopIndex]);

  useEffect(() => {
    setTourCamera(cameraPos);
    return () => { setTourCamera(null); };
  }, [cameraPos, setTourCamera]);

  return (
    <div className="pointer-events-none absolute inset-0 z-40" data-tour-camera>
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_45%)] transition-transform duration-700 ease-out"
        style={{ transform: `translate3d(${cameraPos.x / 18}px, ${cameraPos.y / 18}px, 0)` }}
      />

      {/* 当前视角标记 */}
      <div
        className="absolute left-1/2 top-1/2 h-[62%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.12)] backdrop-blur-[1px] transition-transform duration-700 ease-out"
        style={{ transform: `translate(-50%, -50%) perspective(1200px) rotateX(0.4deg) translate3d(${cameraPos.x / 8}px, ${cameraPos.y / 8}px, 0)` }}
      />

      {/* 顶部区域名 */}
      <div className="absolute left-1/2 top-16 -translate-x-1/2">
        <div className="rounded-xl bg-black/60 px-8 py-4 text-center text-white backdrop-blur-md">
          <h2 className="text-2xl font-bold">{currentStop?.label}</h2>
          <p className="mt-1 text-sm text-white/70">{currentStop?.description}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-white/35">{currentStop?.zone}</p>
        </div>
      </div>

      {/* 当前高亮员工 */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
        <div className="rounded-lg bg-black/40 px-6 py-3 text-center text-white backdrop-blur-sm">
          <p className="text-lg font-medium">
            👤 {currentStop?.employees[currentEmployeeIndex]}
          </p>
          <p className="text-xs text-white/60">
            {currentStopIndex + 1} / {totalStops} 区域
          </p>
        </div>
      </div>

      {/* 进度条 */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div
          className="h-full bg-blue-400 transition-all duration-500 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 跳过按钮 */}
      <button
        onClick={skip}
        className="pointer-events-auto absolute right-6 top-6 flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/30"
      >
        <X className="h-4 w-4" /> 跳过
      </button>
    </div>
  );
};
