import { useMemo } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { ShadowGroup } from "../shared";
import { softBox } from "../geometry";
import { makeTexture, type V3 } from "../utils";
import { Fabric, Wood } from "./common";

/* =====================================================
   「森の木漏れ日」テーマの布もの（ベッド・イス・ソファ・ビーズクッション）を、なめらかな形にしたもの。
   木の家具や小物は元のものをそのまま使う
   ===================================================== */

const COL = { wood: "#c98f52", woodDark: "#a8703a", cream: "#f6ead0", leaf: "#7fa35f", butter: "#e9dca2" };

let cached: ReturnType<typeof buildForestTextures> | null = null;
function buildForestTextures() {
  // 黄緑とクリームのしま
  const stripe = makeTexture(256, 64, (g, w, h) => {
    for (let x = 0; x < w; x += 32) {
      g.fillStyle = (x / 32) % 2 ? "#e9dca2" : "#86ad66";
      g.fillRect(x, 0, 32, h);
    }
  });
  stripe.wrapS = stripe.wrapT = THREE.RepeatWrapping;
  stripe.repeat.set(2, 1);
  return { stripe };
}
function useForestTextures() {
  return useMemo(() => (cached ??= buildForestTextures()), []);
}

/** くまのぬいぐるみ */
function Bear({ position, color = "#d9a066", scale = 1, rotY = 0 }: { position: V3; color?: string; scale?: number; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      <mesh position={[0, 0.08, 0]} scale={[1, 0.95, 0.85]}>
        <sphereGeometry args={[0.085, 24, 18]} />
        <Fabric color={color} sheen={0.9} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.07, 24, 18]} />
        <Fabric color={color} sheen={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.05, 0.26, 0]}>
          <sphereGeometry args={[0.025, 12, 10]} />
          <Fabric color={color} sheen={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.19, 0.06]} scale={[1, 0.8, 0.6]}>
        <sphereGeometry args={[0.03, 12, 10]} />
        <Fabric color="#f3d8aa" />
      </mesh>
    </group>
  );
}

/* ---------- 木のベッド（しまの布団） ---------- */
export function ForestBed({ children }: { children?: ReactNode }) {
  const tex = useForestTextures();
  const geo = useMemo(
    () => ({
      frame: softBox(2.75, 0.28, 2.0, { radius: 0.05, density: 14 }),
      head: softBox(0.1, 1.0, 2.0, { radius: 0.045, density: 12 }),
      foot: softBox(0.1, 0.55, 2.0, { radius: 0.045, density: 12 }),
      mattress: softBox(2.6, 0.3, 1.9, { radius: 0.1, puff: 0.01, density: 18 }),
      duvet: softBox(1.0, 0.13, 1.98, { radius: 0.06, wrinkle: 0.012, puff: 0.04, seed: 101 }),
      pillow: softBox(0.7, 0.2, 0.42, { radius: 0.09, puff: 0.05, wrinkle: 0.006, seed: 103 }),
      cushion: softBox(0.5, 0.45, 0.17, { radius: 0.08, puff: 0.03, wrinkle: 0.004, seed: 105 }),
    }),
    [],
  );
  return (
    <group>
      <ShadowGroup>
        <mesh geometry={geo.frame} position={[1.55, 0.31, -2.0]}>
          <Wood color={COL.wood} />
        </mesh>
        {[
          [0.3, -2.95],
          [2.8, -2.95],
          [0.3, -1.05],
          [2.8, -1.05],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.08, z]}>
            <cylinderGeometry args={[0.06, 0.05, 0.17, 14]} />
            <Wood color={COL.woodDark} />
          </mesh>
        ))}
        <mesh geometry={geo.head} position={[0.22, 0.75, -2.0]}>
          <Wood color="#b8783f" />
        </mesh>
        <mesh geometry={geo.foot} position={[2.88, 0.55, -2.0]}>
          <Wood color="#b8783f" />
        </mesh>
        <mesh geometry={geo.mattress} position={[1.55, 0.58, -2.0]}>
          <Fabric color={COL.cream} sheen={0.2} />
        </mesh>
        <mesh geometry={geo.duvet} position={[2.35, 0.77, -2.0]}>
          <meshPhysicalMaterial color="#ffffff" map={tex.stripe} roughness={0.95} sheen={0.6} sheenColor="#ffffff" />
        </mesh>
        <mesh geometry={geo.pillow} position={[0.62, 0.84, -2.5]} rotation={[0, 0.12, 0]}>
          <Fabric color="#f9e2b6" />
        </mesh>
        <mesh geometry={geo.cushion} position={[1.4, 0.98, -2.88]} rotation={[0.12, 0, 0]}>
          <Fabric color="#f2d3a4" />
        </mesh>
        <mesh geometry={geo.cushion} position={[1.0, 0.98, -2.88]} rotation={[0.12, 0.2, 0.08]}>
          <Fabric color="#cfe0b0" />
        </mesh>
        <Bear position={[0.62, 0.95, -1.55]} rotY={0.5} />
        <Bear position={[0.95, 0.73, -1.35]} color="#e6b98a" scale={1.1} rotY={0.1} />
        <Bear position={[0.3, 0.73, -1.28]} color="#cfa27f" scale={0.85} rotY={0.9} />
      </ShadowGroup>
      {children}
    </group>
  );
}

/* ---------- 木のイス（クッションつき） ---------- */
export function ForestChair({ children }: { children?: ReactNode }) {
  const geo = useMemo(
    () => ({
      seat: softBox(0.6, 0.1, 0.55, { radius: 0.05, puff: 0.025, wrinkle: 0.003 }),
      back: softBox(0.58, 0.55, 0.1, { radius: 0.06, puff: 0.02, wrinkle: 0.003, seed: 111 }),
    }),
    [],
  );
  return (
    <group position={[-1.7, 0, -1.2]} rotation={[0, -Math.PI / 2 + 0.25, 0]}>
      <ShadowGroup>
        <mesh geometry={geo.seat} position={[0, 0.5, 0]}>
          <Fabric color="#f0e4cd" />
        </mesh>
        <mesh geometry={geo.back} position={[0, 0.85, -0.3]} rotation={[-0.12, 0, 0]}>
          <Fabric color="#e8dbc2" />
        </mesh>
        {[
          [-0.24, -0.2],
          [0.24, -0.2],
          [-0.24, 0.2],
          [0.24, 0.2],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.23, z]}>
            <cylinderGeometry args={[0.025, 0.02, 0.46, 12]} />
            <Wood color="#c9a27a" />
          </mesh>
        ))}
      </ShadowGroup>
      {children}
    </group>
  );
}

/* ---------- ソファ ---------- */
export function ForestSofa() {
  const geo = useMemo(
    () => ({
      base: softBox(1.4, 0.3, 0.75, { radius: 0.08, density: 14 }),
      seat: softBox(0.64, 0.14, 0.62, { radius: 0.06, puff: 0.03, wrinkle: 0.004 }),
      back: softBox(1.4, 0.55, 0.2, { radius: 0.09, puff: 0.02, wrinkle: 0.004, seed: 121 }),
      arm: softBox(0.16, 0.45, 0.75, { radius: 0.07 }),
      cushion: softBox(0.36, 0.34, 0.12, { radius: 0.06, puff: 0.03, seed: 123 }),
    }),
    [],
  );
  return (
    <group position={[2.3, 0, 0.7]} rotation={[0, -Math.PI / 2, 0]}>
      <ShadowGroup>
        <mesh geometry={geo.base} position={[0, 0.27, 0]}>
          <Fabric color="#d98b5f" />
        </mesh>
        {[-0.33, 0.33].map((x) => (
          <mesh key={x} geometry={geo.seat} position={[x, 0.48, 0.05]}>
            <Fabric color="#e39a6c" />
          </mesh>
        ))}
        <mesh geometry={geo.back} position={[0, 0.65, -0.3]} rotation={[-0.1, 0, 0]}>
          <Fabric color="#d98b5f" />
        </mesh>
        {[-0.7, 0.7].map((x) => (
          <mesh key={x} geometry={geo.arm} position={[x, 0.45, 0]}>
            <Fabric color="#d98b5f" />
          </mesh>
        ))}
        {[-0.55, 0.55].map((x) =>
          [-0.28, 0.28].map((z) => (
            <RoundedBox key={`${x}${z}`} args={[0.06, 0.1, 0.06]} radius={0.015} smoothness={2} position={[x, 0.05, z]}>
              <Wood color={COL.woodDark} />
            </RoundedBox>
          )),
        )}
        <mesh geometry={geo.cushion} position={[-0.38, 0.72, -0.12]} rotation={[-0.25, 0.15, 0.1]}>
          <Fabric color={COL.butter} />
        </mesh>
        <mesh geometry={geo.cushion} position={[0.42, 0.7, -0.12]} rotation={[-0.25, -0.2, -0.08]}>
          <Fabric color={COL.leaf} />
        </mesh>
      </ShadowGroup>
    </group>
  );
}
