import { useMemo, useRef } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Glow, ShadowGroup } from "../shared";
import { beveledShape, roundedSlab, softBox } from "../geometry";
import { makeTexture } from "../utils";
import { Emissive, Fabric, Glass, Matte, Metal, Wood } from "./common";

/* =====================================================
   「都会の夜」テーマの家具。黒い金属・ガラス・大理石と、むらさきの間接照明
   ===================================================== */

const COL = {
  black: "#18181d",
  graphite: "#2a2a31",
  oak: "#3a2e28",
  boucle: "#e8e4dc",
  violet: "#b56cff",
  magenta: "#ff4fd8",
  lavender: "#b9a6e0",
};

/** テクスチャは一度だけ作って、同じテーマの家具で使い回す */
let cached: ReturnType<typeof buildCityTextures> | null = null;
function buildCityTextures() {
    const chart = makeTexture(512, 300, (g, w, h) => {
      g.fillStyle = "#0e0b1a";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(255,255,255,0.08)";
      for (let x = 0; x < w; x += 32) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, h);
        g.stroke();
      }
      g.strokeStyle = "#c484fc";
      g.lineWidth = 4;
      g.beginPath();
      for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.6 - Math.sin(x * 0.02) * 40 - x * 0.2);
      g.stroke();
      g.fillStyle = "#4fc3ff";
      for (let i = 0; i < 10; i++) g.fillRect(30 + i * 46, h - 20 - ((i * 37) % 90), 26, 20 + ((i * 37) % 90));
    });
    const code = makeTexture(512, 300, (g, w, h) => {
      g.fillStyle = "#120e22";
      g.fillRect(0, 0, w, h);
      const colors = ["#c484fc", "#ff9be0", "#7ff5e6", "#ffd27a", "#9db4ff"];
      for (let i = 0; i < 16; i++) {
        g.fillStyle = colors[i % colors.length];
        g.fillRect(20 + (i % 4) * 18, 18 + i * 17, 60 + ((i * 71) % 260), 8);
      }
    });
    const marble = makeTexture(256, 256, (g, w, h) => {
      g.fillStyle = "#f2f0ec";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(120,120,130,0.35)";
      for (let i = 0; i < 9; i++) {
        g.lineWidth = 1 + (i % 3);
        g.beginPath();
        g.moveTo(0, (i * 41) % h);
        g.bezierCurveTo(w * 0.3, ((i * 67) % h) + 20, w * 0.6, ((i * 23) % h) - 30, w, (i * 89) % h);
        g.stroke();
      }
    });
    const rug = makeTexture(256, 180, (g, w, h) => {
      g.fillStyle = "#3a3842";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(230,225,240,0.55)";
      g.lineWidth = 2;
      for (let i = -h; i < w; i += 22) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i + h * 0.6, h);
        g.stroke();
      }
      g.fillStyle = "#24222b";
      g.fillRect(0, 0, w, 10);
      g.fillRect(0, h - 10, w, 10);
    });
    const art = makeTexture(256, 180, (g, w, h) => {
      const bg = g.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, "#1b1530");
      bg.addColorStop(1, "#3a1c4a");
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#ff6fe0";
      g.beginPath();
      g.arc(w * 0.35, h * 0.5, 50, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#4fc3ff";
      g.fillRect(w * 0.55, h * 0.2, 70, 100);
      g.strokeStyle = "#ffd27a";
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(20, h - 30);
      g.lineTo(w - 20, 30);
      g.stroke();
    });
    return { chart, code, marble, rug, art };
}
function useCityTextures() {
  return useMemo(() => (cached ??= buildCityTextures()), []);
}

/** 平らなモニター（光る画面つき） */
function Monitor({ position, rotationY, map }: { position: [number, number, number]; rotationY: number; map: THREE.Texture }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[0.62, 0.38, 0.025]} radius={0.01} smoothness={3}>
        <Matte color={COL.black} roughness={0.3} />
      </RoundedBox>
      <mesh position={[0, 0.005, 0.014]}>
        <planeGeometry args={[0.59, 0.33]} />
        <meshBasicMaterial map={map} toneMapped={false} color="#e8e8e8" />
      </mesh>
      <mesh position={[0, -0.3, -0.04]}>
        <cylinderGeometry args={[0.012, 0.012, 0.24, 10]} />
        <Metal color="#55575f" />
      </mesh>
    </group>
  );
}

/* ---------- 金属とガラスのデスク ---------- */
export function CityDesk({ glow }: { glow: THREE.Texture }) {
  const tex = useCityTextures();
  const top = useMemo(() => roundedSlab(0.8, 2.1, 0.025, 0.02, 0.006), []);
  return (
    <group>
      <ShadowGroup>
        {/* 黒い金属の枠（コの字の脚） */}
        {[-2.15, -0.25].map((z) => (
          <group key={z} position={[-2.53, 0, z]}>
            {[-0.35, 0.35].map((x) => (
              <mesh key={x} position={[x, 0.38, 0]}>
                <boxGeometry args={[0.03, 0.76, 0.03]} />
                <Matte color={COL.black} roughness={0.3} />
              </mesh>
            ))}
            <mesh position={[0, 0.755, 0]}>
              <boxGeometry args={[0.73, 0.03, 0.03]} />
              <Matte color={COL.black} roughness={0.3} />
            </mesh>
          </group>
        ))}
        <mesh position={[-2.86, 0.755, -1.2]}>
          <boxGeometry args={[0.03, 0.03, 1.9]} />
          <Matte color={COL.black} roughness={0.3} />
        </mesh>
        {/* モニター2枚・ライトバー・ノートPC */}
        <Monitor position={[-2.76, 1.2, -1.6]} rotationY={Math.PI / 2 + 0.15} map={tex.chart} />
        <Monitor position={[-2.76, 1.2, -0.95]} rotationY={Math.PI / 2 - 0.15} map={tex.code} />
        <mesh position={[-2.86, 0.82, -1.27]}>
          <boxGeometry args={[0.16, 0.012, 0.3]} />
          <Matte color="#2b2b33" roughness={0.3} />
        </mesh>
        <group position={[-2.42, 0.79, -0.55]} rotation={[0, Math.PI / 2 + 0.3, 0]}>
          <RoundedBox args={[0.32, 0.012, 0.22]} radius={0.004} smoothness={2} position={[0, 0.006, 0]}>
            <Metal color="#9a9ca4" />
          </RoundedBox>
          <group position={[0, 0.012, -0.11]} rotation={[-1.85, 0, 0]}>
            <RoundedBox args={[0.32, 0.008, 0.22]} radius={0.004} smoothness={2} position={[0, 0, -0.11]}>
              <Metal color="#9a9ca4" />
            </RoundedBox>
            <mesh position={[0, 0.005, -0.11]} rotation={[-Math.PI / 2, 0, Math.PI]}>
              <planeGeometry args={[0.29, 0.19]} />
              <meshBasicMaterial map={tex.code} toneMapped={false} />
            </mesh>
          </group>
        </group>
        <RoundedBox args={[0.14, 0.015, 0.42]} radius={0.006} smoothness={2} position={[-2.36, 0.79, -1.27]}>
          <Matte color="#e6e6ea" roughness={0.35} />
        </RoundedBox>
        <mesh position={[-2.38, 0.79, -1.85]} scale={[1.6, 0.6, 1]}>
          <sphereGeometry args={[0.03, 20, 14]} />
          <Matte color="#e6e6ea" roughness={0.3} />
        </mesh>
        {/* スピーカー */}
        <mesh position={[-2.8, 0.88, -2.05]}>
          <cylinderGeometry args={[0.045, 0.045, 0.18, 28]} />
          <Fabric color="#2b2b33" sheen={0.3} />
        </mesh>
      </ShadowGroup>
      {/* スモークガラスの天板 */}
      <mesh geometry={top} position={[-2.53, 0.775, -1.2]}>
        <meshPhysicalMaterial color="#2a2438" transparent opacity={0.55} roughness={0.1} clearcoat={1} depthWrite={false} />
      </mesh>
      {/* 天板の下のLED */}
      <mesh position={[-2.53, 0.745, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.02, 2.0]} />
        <Emissive color={COL.violet} strength={3} />
      </mesh>
      <mesh position={[-2.86, 1.37, -1.27]}>
        <boxGeometry args={[0.03, 0.02, 0.4]} />
        <Emissive color="#f3ecff" strength={2} />
      </mesh>
      <pointLight position={[-2.4, 1.15, -1.27]} color="#9d8cff" intensity={2.2} distance={2.2} decay={2} />
      <Glow position={[-2.7, 1.2, -1.27]} color="#9d8cff" size={1.4} opacity={0.22} map={glow} />
    </group>
  );
}

/* ---------- メッシュのオフィスチェア ---------- */
export function MeshChair({ children }: { children?: ReactNode }) {
  const geo = useMemo(
    () => ({
      seat: softBox(0.5, 0.08, 0.48, { radius: 0.035, puff: 0.012 }),
      frame: new THREE.TorusGeometry(0.28, 0.018, 10, 40),
    }),
    [],
  );
  return (
    <group position={[-1.75, 0, -1.2]} rotation={[0, -Math.PI / 2 + 0.12, 0]}>
      <ShadowGroup>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2 + 0.3;
          return (
            <group key={i} rotation={[0, a, 0]}>
              <mesh position={[0.16, 0.07, 0]} rotation={[0, 0, Math.PI / 2 - 0.1]}>
                <capsuleGeometry args={[0.018, 0.28, 6, 12]} />
                <Metal color="#8a8c94" roughness={0.25} />
              </mesh>
              <mesh position={[0.31, 0.032, 0]}>
                <sphereGeometry args={[0.032, 16, 12]} />
                <Matte color={COL.black} roughness={0.3} />
              </mesh>
            </group>
          );
        })}
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.026, 0.032, 0.34, 16]} />
          <Metal color="#8a8c94" roughness={0.25} />
        </mesh>
        <mesh geometry={geo.seat} position={[0, 0.47, 0.02]}>
          <Fabric color={COL.graphite} sheen={0.3} />
        </mesh>
        {/* 背もたれの枠 */}
        <mesh geometry={geo.frame} position={[0, 0.88, -0.24]} rotation={[-0.12, 0, 0]} scale={[0.85, 1.25, 1]}>
          <Matte color={COL.black} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.6, -0.24]}>
          <boxGeometry args={[0.05, 0.14, 0.03]} />
          <Matte color={COL.black} roughness={0.3} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.28, 0, 0]}>
            <mesh position={[0, 0.56, -0.02]}>
              <boxGeometry args={[0.025, 0.14, 0.035]} />
              <Matte color={COL.black} roughness={0.3} />
            </mesh>
            <RoundedBox args={[0.07, 0.03, 0.24]} radius={0.012} smoothness={3} position={[0, 0.64, 0]}>
              <Matte color={COL.graphite} roughness={0.5} />
            </RoundedBox>
          </group>
        ))}
      </ShadowGroup>
      {/* メッシュ（向こうが少し透ける） */}
      <mesh position={[0, 0.88, -0.24]} rotation={[-0.12, 0, 0]} scale={[0.85, 1.25, 1]}>
        <circleGeometry args={[0.28, 40]} />
        <meshStandardMaterial color="#1d1d24" transparent opacity={0.75} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
      {children}
    </group>
  );
}

/* ---------- 低いベッドと下の間接照明 ---------- */
export function CityBed({ children }: { children?: ReactNode }) {
  const geo = useMemo(
    () => ({
      base: softBox(2.7, 0.22, 2.0, { radius: 0.03, density: 12 }),
      head: softBox(0.1, 0.8, 2.3, { radius: 0.03, density: 12 }),
      mattress: softBox(2.55, 0.24, 1.9, { radius: 0.08, puff: 0.01, density: 18 }),
      duvet: softBox(1.95, 0.11, 2.02, { radius: 0.055, wrinkle: 0.016, puff: 0.03, seed: 81 }),
      pillow: softBox(0.42, 0.15, 0.66, { radius: 0.07, puff: 0.045, wrinkle: 0.006, seed: 83 }),
      throwB: softBox(0.6, 0.04, 2.06, { radius: 0.018, wrinkle: 0.01, seed: 85 }),
    }),
    [],
  );
  return (
    <group>
      <ShadowGroup>
        <mesh geometry={geo.base} position={[1.55, 0.17, -2.0]}>
          <Wood color={COL.oak} />
        </mesh>
        <mesh geometry={geo.head} position={[0.22, 0.6, -2.0]}>
          <Wood color={COL.oak} />
        </mesh>
        <mesh geometry={geo.mattress} position={[1.6, 0.4, -2.0]}>
          <Fabric color="#f0eeea" sheen={0.2} />
        </mesh>
        <mesh geometry={geo.duvet} position={[1.95, 0.56, -2.0]}>
          <Fabric color="#c9c6cf" sheen={0.6} />
        </mesh>
        <mesh geometry={geo.throwB} position={[2.6, 0.62, -2.0]}>
          <Fabric color="#4a3a5a" sheen={0.8} />
        </mesh>
        <mesh geometry={geo.pillow} position={[0.6, 0.6, -2.42]} rotation={[0, 0.06, 0.05]}>
          <Fabric color="#f4f2ee" sheen={0.3} />
        </mesh>
        <mesh geometry={geo.pillow} position={[0.6, 0.6, -1.6]} rotation={[0, -0.08, -0.04]}>
          <Fabric color={COL.lavender} sheen={0.5} />
        </mesh>
      </ShadowGroup>
      <mesh position={[1.55, 0.03, -0.99]}>
        <boxGeometry args={[2.6, 0.02, 0.01]} />
        <Emissive color={COL.violet} strength={3} />
      </mesh>
      <mesh position={[0.18, 1.0, -2.0]}>
        <boxGeometry args={[0.012, 0.012, 2.2]} />
        <Emissive color="#f3ecff" strength={2} />
      </mesh>
      {children}
    </group>
  );
}

/* ---------- 浮いた棚とガラスの球のランプ ---------- */
export function CityNightstand({ glow }: { glow: THREE.Texture }) {
  return (
    <group position={[2.55, 0, -0.5]}>
      <ShadowGroup>
        <RoundedBox args={[0.55, 0.32, 0.45]} radius={0.015} smoothness={3} position={[0, 0.42, 0]}>
          <Matte color={COL.black} roughness={0.35} />
        </RoundedBox>
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.26, 10]} />
          <Metal color="#55575f" />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.02, 28]} />
          <Matte color={COL.black} roughness={0.35} />
        </mesh>
        <RoundedBox args={[0.18, 0.03, 0.24]} radius={0.006} smoothness={2} position={[0.12, 0.6, 0.06]} rotation={[0, 0.3, 0]}>
          <Matte color="#c9a0ff" roughness={0.7} />
        </RoundedBox>
      </ShadowGroup>
      <mesh position={[-0.1, 0.7, -0.05]}>
        <sphereGeometry args={[0.11, 32, 24]} />
        <Emissive color="#ffe2f4" strength={1.4} />
      </mesh>
      <pointLight position={[-0.1, 0.72, -0.05]} color="#ffb0e8" intensity={3} distance={3} decay={2} />
      <Glow position={[-0.1, 0.7, -0.05]} color="#ff9be0" size={1.0} opacity={0.4} map={glow} />
    </group>
  );
}

/* ---------- 線の入ったラグ ---------- */
export function CityRug() {
  const tex = useCityTextures();
  const geo = useMemo(() => softBox(2.5, 0.02, 1.75, { radius: 0.01, density: 16 }), []);
  return (
    <mesh geometry={geo} position={[-0.1, 0.01, 1.0]} receiveShadow>
      <meshPhysicalMaterial map={tex.rug} roughness={1} sheen={0.5} sheenColor="#fff" />
    </mesh>
  );
}

/* ---------- ブークレのソファ ---------- */
export function CitySofa() {
  const geo = useMemo(
    () => ({
      base: softBox(1.7, 0.26, 0.9, { radius: 0.12, wrinkle: 0.003, density: 18 }),
      seat: softBox(0.8, 0.16, 0.7, { radius: 0.08, puff: 0.03, wrinkle: 0.004 }),
      back: softBox(1.7, 0.36, 0.24, { radius: 0.11, puff: 0.02, wrinkle: 0.004, seed: 91 }),
      pillow: softBox(0.36, 0.34, 0.12, { radius: 0.06, puff: 0.03, seed: 93 }),
    }),
    [],
  );
  const boucle = <meshPhysicalMaterial color={COL.boucle} roughness={1} sheen={1} sheenRoughness={0.9} sheenColor="#ffffff" />;
  return (
    <group position={[2.3, 0, 0.7]} rotation={[0, -Math.PI / 2, 0]}>
      <ShadowGroup>
        <mesh geometry={geo.base} position={[0, 0.15, 0]}>
          {boucle}
        </mesh>
        {[-0.41, 0.41].map((x) => (
          <mesh key={x} geometry={geo.seat} position={[x, 0.34, 0.08]}>
            {boucle}
          </mesh>
        ))}
        <mesh geometry={geo.back} position={[0, 0.48, -0.33]}>
          {boucle}
        </mesh>
        <mesh geometry={geo.pillow} position={[-0.5, 0.6, -0.12]} rotation={[-0.25, 0.25, 0.12]}>
          <Fabric color={COL.lavender} />
        </mesh>
        <mesh geometry={geo.pillow} position={[0.5, 0.58, -0.12]} rotation={[-0.25, -0.2, -0.1]}>
          <Fabric color="#3a2e4a" />
        </mesh>
      </ShadowGroup>
    </group>
  );
}

/* ---------- 黒い金属の棚（レコードとオブジェ） ---------- */
const VINYL = ["#ff6fe0", "#4fc3ff", "#ffd27a", "#c484fc", "#7ff5e6", "#f28fad"];
export function CityShelf() {
  const knot = useMemo(() => new THREE.TorusKnotGeometry(0.06, 0.018, 100, 16), []);
  return (
    <group position={[-2.72, 0, 0.6]} rotation={[0, Math.PI / 2, 0]}>
      <ShadowGroup>
        {[-0.5, 0, 0.5].map((x) => (
          <mesh key={x} position={[x, 0.85, 0]}>
            <boxGeometry args={[0.025, 1.7, 0.36]} />
            <Matte color={COL.black} roughness={0.35} />
          </mesh>
        ))}
        {[0.03, 0.45, 0.87, 1.29, 1.7].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[1.02, 0.025, 0.36]} />
            <Matte color={COL.black} roughness={0.35} />
          </mesh>
        ))}
        {/* レコード（ジャケットの背） */}
        {VINYL.map((c, i) => (
          <RoundedBox key={i} args={[0.012, 0.32, 0.32]} radius={0.003} smoothness={2} position={[-0.42 + i * 0.03, 0.21, 0]} rotation={[0, 0, i % 3 === 2 ? 0.08 : 0]}>
            <Matte color={c} roughness={0.6} />
          </RoundedBox>
        ))}
        <RoundedBox args={[0.3, 0.3, 0.01]} radius={0.003} smoothness={2} position={[0.25, 0.62, -0.1]} rotation={[-0.1, 0, 0]}>
          <Matte color="#ff6fe0" roughness={0.6} />
        </RoundedBox>
        {/* 本 */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <RoundedBox key={i} args={[0.035, 0.26 + (i % 3) * 0.02, 0.24]} radius={0.004} smoothness={2} position={[-0.4 + i * 0.04, 1.02 + (i % 3) * 0.01, 0.02]}>
            <Matte color={["#e6e6ea", "#2b2b33", "#c9a0ff"][i % 3]} roughness={0.7} />
          </RoundedBox>
        ))}
        {/* オブジェ */}
        <mesh geometry={knot} position={[0.25, 1.4, 0.02]}>
          <meshStandardMaterial color="#d8c08a" metalness={1} roughness={0.2} />
        </mesh>
        <mesh position={[-0.25, 1.4, 0.02]}>
          <sphereGeometry args={[0.08, 32, 24]} />
          <meshPhysicalMaterial color="#e6e6ea" roughness={0.1} clearcoat={1} />
        </mesh>
        <mesh position={[0.25, 1.82, 0.02]}>
          <cylinderGeometry args={[0.06, 0.05, 0.2, 24]} />
          <Matte color="#e6e6ea" roughness={0.3} />
        </mesh>
      </ShadowGroup>
    </group>
  );
}

/* ---------- 大理石のコーヒーテーブル ---------- */
export function MarbleTable() {
  const tex = useCityTextures();
  return (
    <group position={[-0.65, 0, 1.75]}>
      <ShadowGroup>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.04, 64]} />
          <meshPhysicalMaterial map={tex.marble} roughness={0.15} clearcoat={0.8} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.16, 0.2, 0.32, 40]} />
          <Matte color={COL.black} roughness={0.35} />
        </mesh>
        <RoundedBox args={[0.26, 0.012, 0.2]} radius={0.004} smoothness={2} position={[-0.12, 0.366, 0.05]} rotation={[0, 0.3, 0]}>
          <Matte color="#2b2b33" roughness={0.6} />
        </RoundedBox>
      </ShadowGroup>
      <mesh position={[0.15, 0.41, -0.1]}>
        <cylinderGeometry args={[0.035, 0.03, 0.1, 24]} />
        <Glass color="#e8f0ff" opacity={0.3} />
      </mesh>
    </group>
  );
}

/* ---------- 縦長のLEDライト ---------- */
export function LedFloorBar({ glow }: { glow: THREE.Texture }) {
  const bar = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (bar.current) bar.current.color.setHSL(0.8 + Math.sin(clock.elapsedTime * 0.3) * 0.06, 1, 0.65).multiplyScalar(2.2);
  });
  return (
    <group position={[-0.55, 0, -2.6]}>
      <ShadowGroup>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.03, 24]} />
          <Matte color={COL.black} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.85, -0.02]}>
          <boxGeometry args={[0.05, 1.6, 0.03]} />
          <Matte color={COL.black} roughness={0.35} />
        </mesh>
      </ShadowGroup>
      <mesh position={[0, 0.85, 0.0]}>
        <boxGeometry args={[0.03, 1.56, 0.02]} />
        <meshBasicMaterial ref={bar} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.0, 0.2]} color={COL.magenta} intensity={3} distance={3} decay={2} />
      <Glow position={[0, 0.9, 0.05]} color={COL.violet} size={1.4} opacity={0.35} map={glow} />
    </group>
  );
}

/* ---------- エレキギター ---------- */
export function ElectricGuitar() {
  const body = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.22);
    s.bezierCurveTo(0.17, -0.22, 0.2, -0.1, 0.17, 0.0);
    s.bezierCurveTo(0.15, 0.06, 0.1, 0.06, 0.12, 0.14);
    s.bezierCurveTo(0.14, 0.22, 0.08, 0.26, 0.05, 0.2);
    s.bezierCurveTo(0.03, 0.16, -0.03, 0.16, -0.06, 0.22);
    s.bezierCurveTo(-0.1, 0.3, -0.16, 0.24, -0.14, 0.12);
    s.bezierCurveTo(-0.12, 0.05, -0.17, 0.04, -0.18, -0.03);
    s.bezierCurveTo(-0.2, -0.14, -0.15, -0.22, 0, -0.22);
    return beveledShape(s, 0.04, 0.012);
  }, []);
  return (
    <group position={[-1.45, 0.02, -2.72]} rotation={[-0.2, 0.25, 0]}>
      <ShadowGroup>
        <mesh geometry={body} position={[0, 0.3, 0]}>
          <meshPhysicalMaterial color="#141418" roughness={0.2} clearcoat={1} clearcoatRoughness={0.1} />
        </mesh>
        <mesh position={[0.02, 0.27, 0.035]}>
          <circleGeometry args={[0.1, 32]} />
          <Matte color="#f2f2f2" roughness={0.3} />
        </mesh>
        {[0.22, 0.32].map((y) => (
          <RoundedBox key={y} args={[0.08, 0.025, 0.01]} radius={0.004} smoothness={2} position={[0, y, 0.042]}>
            <Metal color="#c9ccd2" />
          </RoundedBox>
        ))}
        <RoundedBox args={[0.055, 0.6, 0.03]} radius={0.01} smoothness={3} position={[0, 0.82, 0.01]}>
          <Wood color="#5a3a22" />
        </RoundedBox>
        <RoundedBox args={[0.07, 0.16, 0.025]} radius={0.012} smoothness={3} position={[0.01, 1.18, 0.0]} rotation={[0, 0, -0.1]}>
          <Matte color="#141418" roughness={0.3} />
        </RoundedBox>
      </ShadowGroup>
    </group>
  );
}

/* ---------- ネオンのライン・アート ---------- */
export function CityDecor() {
  const tex = useCityTextures();
  const wave = useMemo(() => {
    const pts = Array.from({ length: 30 }, (_, i) => new THREE.Vector3(0, Math.sin(i * 0.5) * 0.12, -0.6 + i * 0.04));
    return new THREE.CatmullRomCurve3(pts);
  }, []);
  return (
    <group>
      {/* 左の壁のネオン（波） */}
      <mesh position={[-2.96, 2.3, 0.6]}>
        <tubeGeometry args={[wave, 120, 0.012, 8, false]} />
        <Emissive color={COL.magenta} strength={2.6} />
      </mesh>
      {/* 奥の壁の大きなアート */}
      <group position={[-1.3, 2.1, -2.96]}>
        <RoundedBox args={[1.1, 0.8, 0.03]} radius={0.01} smoothness={2}>
          <Matte color="#0e0c14" />
        </RoundedBox>
        <mesh position={[0, 0, 0.017]}>
          <planeGeometry args={[1.02, 0.72]} />
          <meshStandardMaterial map={tex.art} roughness={0.6} />
        </mesh>
      </group>
      {/* 天井ぞいの間接照明 */}
      <mesh position={[0, 3.52, -2.93]}>
        <boxGeometry args={[5.9, 0.02, 0.02]} />
        <Emissive color={COL.violet} strength={2.2} />
      </mesh>
    </group>
  );
}
