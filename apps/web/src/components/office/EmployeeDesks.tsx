import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text, RoundedBox } from "@react-three/drei";
import { api } from "~/utils/api";
import { useAppStore } from "~/stores/appStore";

const ZONE_COLORS: Record<string, string> = {
  strategy: "#6366f1", research: "#06b6d4", product: "#10b981",
  sales: "#f59e0b", marketing: "#ec4899", finance: "#8b5cf6",
};
const ZONE_LABELS: Record<string, string> = {
  strategy: "战略", research: "研究", product: "产品",
  sales: "销售", marketing: "市场", finance: "财务",
};
const ZONES = Object.keys(ZONE_COLORS);

const STATUS_COLORS: Record<string, string> = {
  IDLE: "#94a3b8", WORKING: "#22c55e", BLOCKED: "#ef4444", AWAITING_APPROVAL: "#f97316", DONE: "#3b82f6",
};
const STATUS_LABELS: Record<string, string> = {
  IDLE: "空闲", WORKING: "工作中", BLOCKED: "阻塞", AWAITING_APPROVAL: "待审批", DONE: "完成",
};

interface OfficeMember {
  id: string;
  name: string;
  type: "human" | "digital_twin" | "pure_agent";
  status: string;
  zone: string;
  parentName?: string;
}

function Avatar({ pos, member, onClick }: { pos: THREE.Vector3; member: OfficeMember; onClick: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const color = STATUS_COLORS[member.status] ?? "#94a3b8";
  const isHuman = member.type === "human";
  const isTwin = member.type === "digital_twin";

  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = pos.y + Math.sin(s.clock.elapsedTime * 2 + pos.x) * 0.12;
    ref.current.rotation.y += isHuman ? 0.002 : 0.005;
  });

  return (
    <group ref={ref} position={pos.toArray() as [number, number, number]} onClick={onClick}>
      {/* glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <ringGeometry args={[0.3, 0.38, 32]} />
        <meshBasicMaterial color={isHuman ? "#f59e0b" : isTwin ? "#6366f1" : color} transparent opacity={0.3} />
      </mesh>
      {/* body shape differs by type */}
      {isHuman ? (
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 0.5, 8]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
        </mesh>
      ) : (
        <RoundedBox args={[0.32, 0.4, 0.32]} radius={0.08} position={[0, -0.08, 0]}>
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
        </RoundedBox>
      )}
      {/* head */}
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.5} />
      </mesh>
      {/* type indicator dot */}
      <mesh position={[0, 0.52, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={isHuman ? "#f59e0b" : isTwin ? "#6366f1" : "#06b6d4"} />
      </mesh>
      <Text position={[0, 0.75, 0]} fontSize={0.1} color="#e2e8f0" anchorX="center" anchorY="bottom">
        {member.name}
      </Text>
      <Text position={[0, 0.88, 0]} fontSize={0.07} color="#94a3b8" anchorX="center" anchorY="bottom">
        {isHuman ? "员工" : isTwin ? "分身" : "Agent"} · {STATUS_LABELS[member.status] ?? member.status}
      </Text>
    </group>
  );
}

function ZoneIsland({ zone, index, total, members, onSelect }: { zone: string; index: number; total: number; members: OfficeMember[]; onSelect: (id: string, type: string) => void }) {
  const color = ZONE_COLORS[zone] ?? "#6366f1";
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const radius = 4.5;
  const cx = Math.cos(angle) * radius;
  const cz = Math.sin(angle) * radius;

  return (
    <group position={[cx, 0, cz]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
        <circleGeometry args={[1.5, 6]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} transparent opacity={0.12} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.68, 0]}>
        <ringGeometry args={[1.35, 1.5, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
      <Text position={[0, 1.5, 0]} fontSize={0.26} color={color} anchorX="center" outlineWidth={0.02} outlineColor="#0f172a">
        {ZONE_LABELS[zone] ?? zone}
      </Text>
      {members.length === 0 && (
        <Text position={[0, -0.2, 0]} fontSize={0.1} color="#475569" anchorX="center">(空)</Text>
      )}
      {members.map((m, i) => {
        const subAngle = (i / Math.max(members.length || 1, 1)) * Math.PI * 2;
        const sr = Math.min(0.9, 0.3 + members.length * 0.2);
        const ap = new THREE.Vector3(Math.cos(subAngle) * sr, -0.45, Math.sin(subAngle) * sr);
        return <Avatar key={m.id} pos={ap} member={m} onClick={() => onSelect(m.id, m.type)} />;
      })}
    </group>
  );
}

export function EmployeeDesks() {
  const openDetailPanel = useAppStore((s) => s.openDetailPanel);
  const { data: agents } = api.agent.list.useQuery();
  const { data: employees } = api.employee.list.useQuery();

  const members = useMemo<OfficeMember[]>(() => {
    const list: OfficeMember[] = [];

    // Real employees
    if (employees) {
      for (const emp of employees) {
        if (!emp.isActive) continue;
        list.push({
          id: emp.id, name: emp.name, type: "human",
          status: "IDLE",
          zone: emp.department ? ZONES.find(z => ZONE_LABELS[z] === emp.department) ?? ZONES[Math.abs(emp.name.length) % ZONES.length]! : ZONES[0]!,
        });
      }
    }

    // Agents (digital twins and pure agents)
    if (agents) {
      for (const agent of agents) {
        if (!agent.isActive) continue;
        const zoneIdx = Math.abs(agent.id.length + (agent.presetRoleId?.length ?? 0)) % ZONES.length;
        list.push({
          id: agent.id, name: agent.name,
          type: agent.type === "DIGITAL_TWIN" ? "digital_twin" : "pure_agent",
          status: agent.status,
          zone: ZONES[zoneIdx]!,
          parentName: agent.ownerName || undefined,
        });
      }
    }

    return list;
  }, [agents, employees]);

  const grouped = useMemo(() => {
    const map: Record<string, OfficeMember[]> = {};
    for (const z of ZONES) map[z] = [];
    for (const m of members) {
      (map[m.zone] ??= []).push(m);
    }
    return map;
  }, [members]);

  if (!agents && !employees) return null;

  return (
    <group>
      {/* center hub */}
      <mesh position={[0, -0.75, 0]}>
        <cylinderGeometry args={[1.2, 1.4, 0.15, 24]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.0, 1.25, 24]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.5} />
      </mesh>
      <Text position={[0, 1.8, 0]} fontSize={0.4} color="#f1f5f9" anchorX="center" outlineWidth={0.03} outlineColor="#0f172a">
        数智企业
      </Text>
      <Text position={[0, 1.3, 0]} fontSize={0.12} color="#94a3b8" anchorX="center">
        {members.length} 位成员
      </Text>

      {Object.entries(grouped).map(([zone, zoneMembers], i) => (
        <ZoneIsland key={zone} zone={zone} index={i} total={ZONES.length} members={zoneMembers} onSelect={(id, type) => openDetailPanel(type === "human" ? "employee" : "agent", { id })} />
      ))}

      {/* connecting beams */}
      {ZONES.map((_, i) => {
        const angle = (i / ZONES.length) * Math.PI * 2 - Math.PI / 2;
        const sx = Math.cos(angle) * 1.3;
        const sz = Math.sin(angle) * 1.3;
        const ex = Math.cos(angle) * 3.3;
        const ez = Math.sin(angle) * 3.3;
        return (
          <mesh key={`beam-${i}`} position={[(sx + ex) / 2, -0.65, (sz + ez) / 2]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[2.0, 0.02, 0.02]} />
            <meshBasicMaterial color={ZONE_COLORS[ZONES[i]!]} transparent opacity={0.25} />
          </mesh>
        );
      })}
    </group>
  );
}
