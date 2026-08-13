import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { EmployeeDesks } from "./EmployeeDesks";
import { SceneInteraction } from "./SceneInteraction";
import { useAppStore } from "~/stores/appStore";

function TourCameraController() {
  const tourCamera = useAppStore((s) => s.tourCamera);
  const { camera } = useThree();

  useFrame(() => {
    if (!tourCamera) return;
    const ease = 0.08;
    camera.position.x += (tourCamera.x - camera.position.x) * ease;
    camera.position.y += (tourCamera.y - camera.position.y) * ease;
    camera.position.z += (tourCamera.z - camera.position.z) * ease;
    camera.lookAt(0, 1, 0);
  });

  return null;
}

function GroundPlane() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0.3} />
      </mesh>
      {/* grid lines */}
      {Array.from({ length: 29 }).map((_, i) => {
        const x = i - 14;
        return (
          <mesh key={`gx-${i}`} position={[x, -1.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.015, 30]} />
            <meshBasicMaterial color="#1e293b" transparent opacity={0.4} />
          </mesh>
        );
      })}
      {Array.from({ length: 29 }).map((_, i) => {
        const z = i - 14;
        return (
          <mesh key={`gz-${i}`} position={[0, -1.48, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[30, 0.015]} />
            <meshBasicMaterial color="#1e293b" transparent opacity={0.4} />
          </mesh>
        );
      })}
      {/* outer ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.47, 0]}>
        <ringGeometry args={[5.8, 6.0, 64]} />
        <meshBasicMaterial color="#334155" transparent opacity={0.6} />
      </mesh>
      {/* inner ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.47, 0]}>
        <ringGeometry args={[1.6, 1.7, 48]} />
        <meshBasicMaterial color="#475569" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export const OfficeSceneInner = () => {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 10, 8], fov: 50 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: "radial-gradient(ellipse at center, #1e293b 0%, #0f172a 70%)" }}
        >
          <PerspectiveCamera makeDefault position={[0, 10, 8]} fov={50} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[8, 12, 4]} intensity={0.7} />
          <pointLight position={[-4, 3, -4]} intensity={0.3} color="#6366f1" />

          <GroundPlane />
          <EmployeeDesks />
          <SceneInteraction />
          <TourCameraController />

          <OrbitControls
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI / 2.3}
            minDistance={4}
            maxDistance={18}
            enablePan={true}
            panSpeed={0.4}
          />
        </Canvas>
      </div>
    </div>
  );
};
