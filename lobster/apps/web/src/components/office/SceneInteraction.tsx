import { useCallback, useRef, useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useOfficeStore } from "./officeStore";
import { useAppStore } from "~/stores/appStore";

/** 交互层 — 点击空白取消选中 */
export const SceneInteraction = () => {
  const { camera, gl, scene } = useThree();
  const selectEmployee = useOfficeStore((s) => s.selectEmployee);
  const closeDetailPanel = useAppStore((s) => s.closeDetailPanel);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      // 检测是否点击了 3D 物体
      const raycaster = new THREE.Raycaster();
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);

      // 检测与场景中物体的相交
      const intersects = raycaster.intersectObjects(scene.children, true);

      // 如果点击的不是任何工位（没有 sphereGeometry 的 mesh），取消选中
      if (intersects.length === 0) {
        selectEmployee(null);
        closeDetailPanel();
      }
    },
    [camera, gl, selectEmployee, closeDetailPanel]
  );

  useEffect(() => {
    gl.domElement.addEventListener("click", handleClick);
    return () => gl.domElement.removeEventListener("click", handleClick);
  }, [gl, handleClick]);

  return null;
};
