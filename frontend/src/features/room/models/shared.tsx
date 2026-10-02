import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import type { V3 } from "./utils";

/* 部屋の3Dモデルで共通して使う部品 */

/** 中の全メッシュに影を付ける */
export function ShadowGroup({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    ref.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
  }, []);
  return <group ref={ref}>{children}</group>;
}

/** 2点を結ぶカプセル（腕など） */
export function Limb({ a, b, r, color }: { a: V3; b: V3; r: number; color: string }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const length = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { pos: va.clone().add(vb).multiplyScalar(0.5), quat: q, len: length };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat}>
      <capsuleGeometry args={[r, Math.max(len - r * 2, 0.001), 6, 14]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

/** 光のにじみ（加算合成のスプライト） */
export function Glow({ position, color, size, opacity = 0.8, map }: { position: V3; color: string; size: number; opacity?: number; map: THREE.Texture }) {
  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial map={map} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}
