import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import Draggable from "./features/room/Draggable";
import LayoutToolbar from "./features/room/LayoutToolbar";
import { selectAvatar, selectFurniture, selectIsPlaced, selectWallpaper } from "./features/room/roomLayoutSlice";
import { useRoomSync } from "./features/room/useRoomSync";
import { Beanbag, Bookshelf, Cactus, Fishbowl, FloorLamp, Guitar, LowTable, Sofa } from "./features/room/models/NewFurniture";
import Resident from "./features/room/models/Resident";
import { Glow, ShadowGroup } from "./features/room/models/shared";
import { makeTexture, type V3 } from "./features/room/models/utils";
import { getWallpaper } from "./features/room/models/wallpapers";
import "./Room.css";

/* =====================================================
   部屋の寸法
   床: x -3〜3, z -3〜3 / 奥の壁: z=-3 / 左の壁: x=-3
   ===================================================== */
const WALL_H = 3.6;
const WALL_T = 0.18;
const WIN = { cx: 1.3, w: 1.0, bottom: 0.95, spring: 2.35 }; // 奥の壁のアーチ窓

const C = {
  wood: "#c9915a",
  woodDark: "#8f5f35",
  cream: "#f3e8cc",
  leaf1: "#5f9d57",
  leaf2: "#76b565",
  leaf3: "#4f8a4c",
  terracotta: "#d98b5f",
};

/* =====================================================
   テクスチャ（Canvasで生成）
   ===================================================== */
function useTextures() {
  return useMemo(() => {
    const glow = makeTexture(128, 128, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.3, "rgba(255,255,255,0.35)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });

    const wood = makeTexture(512, 512, (g, w, h) => {
      g.fillStyle = "#c48d58";
      g.fillRect(0, 0, w, h);
      const planks = 8;
      for (let i = 0; i < planks; i++) {
        const y = (i * h) / planks;
        const l = 50 + ((i * 37) % 14);
        g.fillStyle = `hsl(28, 42%, ${l}%)`;
        g.fillRect(0, y, w, h / planks - 3);
        g.fillStyle = "rgba(60,30,10,0.45)";
        g.fillRect(0, y + h / planks - 3, w, 3);
        // 継ぎ目
        const jx = (i * 173) % w;
        g.fillRect(jx, y, 3, h / planks);
        // 木目
        g.strokeStyle = "rgba(90,50,20,0.14)";
        for (let k = 0; k < 5; k++) {
          g.beginPath();
          const yy = y + 6 + k * 7;
          g.moveTo(0, yy);
          g.bezierCurveTo(w * 0.3, yy + 3, w * 0.6, yy - 3, w, yy + 1);
          g.stroke();
        }
      }
    });
    wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
    wood.repeat.set(1.4, 1.4);

    const sky = makeTexture(8, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "#f3f6b8");
      gr.addColorStop(0.5, "#cfe6a0");
      gr.addColorStop(1, "#86be76");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });

    const screen = makeTexture(512, 320, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, "#2f6a5e");
      gr.addColorStop(1, "#173a3a");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.shadowColor = "#b4ffd0";
      g.shadowBlur = 24;
      g.fillStyle = "#d4ffe0";
      g.font = "800 150px system-ui, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("SWM", w / 2, h / 2 + 6);
    });

    const zee = makeTexture(64, 64, (g, w, h) => {
      g.fillStyle = "#fff6cf";
      g.font = "800 52px system-ui, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("z", w / 2, h / 2 + 2);
    });

    const picture = makeTexture(256, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "#f6f3c0");
      gr.addColorStop(1, "#9fcf8a");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#fff9d8";
      g.beginPath();
      g.arc(w * 0.7, h * 0.3, 26, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#5f9d57";
      g.beginPath();
      g.moveTo(0, h * 0.75);
      g.quadraticCurveTo(w * 0.3, h * 0.45, w * 0.6, h * 0.72);
      g.quadraticCurveTo(w * 0.8, h * 0.6, w, h * 0.7);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.fill();
      g.fillStyle = "#3f7d46";
      g.beginPath();
      g.moveTo(0, h * 0.85);
      g.quadraticCurveTo(w * 0.5, h * 0.62, w, h * 0.86);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.fill();
    });

    return { glow, wood, sky, screen, zee, picture };
  }, []);
}
type Tex = ReturnType<typeof useTextures>;

/* =====================================================
   植物
   ===================================================== */
function Plant({ position, scale = 1, phase = 0, pot = C.terracotta, rotY = 0 }: { position: V3; scale?: number; phase?: number; pot?: string; rotY?: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) {
      const t = clock.elapsedTime + phase;
      g.current.rotation.z = Math.sin(t * 0.9) * 0.025;
      g.current.rotation.x = Math.cos(t * 0.7) * 0.02;
    }
  });
  const leaves = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.3;
        const tilt = 0.35 + (i % 3) * 0.18;
        return { a, tilt, h: 0.2 + (i % 3) * 0.06, c: [C.leaf1, C.leaf2, C.leaf3][i % 3] };
      }),
    [],
  );
  return (
    <group position={position} scale={scale} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.13, 0.095, 0.22, 24]} />
        <meshStandardMaterial color={pot} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.215, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 24]} />
        <meshStandardMaterial color="#4b2e1e" roughness={1} />
      </mesh>
      <group ref={g} position={[0, 0.22, 0]}>
        {leaves.map((l, i) => (
          <group key={i} rotation={[0, l.a, 0]}>
            <mesh position={[0, l.h, 0.05]} rotation={[l.tilt, 0, 0]} scale={[0.07, l.h + 0.08, 0.025]}>
              <sphereGeometry args={[1, 14, 14]} />
              <meshStandardMaterial color={l.c} roughness={0.7} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function HangingPlant({ position, phase = 0 }: { position: V3; phase?: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + phase) * 0.06;
  });
  return (
    <group position={position}>
      <group ref={g}>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.4, 6]} />
          <meshStandardMaterial color="#efe2b0" />
        </mesh>
        <mesh position={[0, -0.47, 0]}>
          <cylinderGeometry args={[0.12, 0.08, 0.14, 20]} />
          <meshStandardMaterial color={C.terracotta} roughness={0.8} />
        </mesh>
        {[
          [-0.07, -0.37, 0.02, 0.1, C.leaf1],
          [0.07, -0.37, -0.02, 0.1, C.leaf2],
          [0, -0.34, 0.05, 0.11, C.leaf3],
          [0.02, -0.34, -0.06, 0.09, C.leaf2],
        ].map(([x, y, z, r, c], i) => (
          <mesh key={i} position={[x as number, y as number, z as number]}>
            <sphereGeometry args={[r as number, 16, 16]} />
            <meshStandardMaterial color={c as string} roughness={0.7} />
          </mesh>
        ))}
        {[-0.07, 0.06].map((x, i) => (
          <mesh key={i} position={[x, -0.68, 0.03]} rotation={[0, 0, x * 0.8]}>
            <capsuleGeometry args={[0.018, 0.28, 4, 8]} />
            <meshStandardMaterial color={i ? C.leaf2 : C.leaf1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* =====================================================
   小物
   ===================================================== */
function Bear({ position, color = "#d9a066", scale = 1, rotY = 0 }: { position: V3; color?: string; scale?: number; rotY?: number }) {
  return (
    <group position={position} scale={scale} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.1, 0]} scale={[1, 1.05, 0.9]}>
        <sphereGeometry args={[0.11, 20, 20]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.27, 0.01]}>
        <sphereGeometry args={[0.095, 20, 20]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 0.34, 0]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.255, 0.075]} scale={[1, 0.75, 0.7]}>
        <sphereGeometry args={[0.04, 14, 14]} />
        <meshStandardMaterial color="#f3d8aa" roughness={0.95} />
      </mesh>
      {[-0.03, 0.03].map((x) => (
        <mesh key={x} position={[x, 0.29, 0.088]}>
          <sphereGeometry args={[0.009, 8, 8]} />
          <meshStandardMaterial color="#2a1a10" />
        </mesh>
      ))}
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.12, 0.03]} rotation={[0, 0, x * 3]}>
          <capsuleGeometry args={[0.03, 0.06, 4, 8]} />
          <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function Candle({ position, phase = 0, tex }: { position: V3; phase?: number; tex: Tex }) {
  const flame = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Sprite>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 9 + phase;
    const f = 1 + Math.sin(t) * 0.1 + Math.sin(t * 2.3) * 0.07;
    if (flame.current) flame.current.scale.set(1 / f, f, 1 / f);
    if (halo.current) halo.current.scale.setScalar(0.5 * f);
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.022, 0.024, 0.1, 14]} />
        <meshStandardMaterial color="#fff1d0" roughness={0.6} />
      </mesh>
      <mesh ref={flame} position={[0, 0.125, 0]} scale={[1, 1.4, 1]}>
        <sphereGeometry args={[0.014, 10, 10]} />
        <meshBasicMaterial color="#ffd27a" toneMapped={false} />
      </mesh>
      <sprite ref={halo} position={[0, 0.13, 0]} scale={[0.5, 0.5, 1]}>
        <spriteMaterial map={tex.glow} color="#ffb85c" transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

function Cat({ position, tex }: { position: V3; tex: Tex }) {
  const body = useRef<THREE.Mesh>(null);
  const zs = useRef<(THREE.Sprite | null)[]>([]);
  const fur = "#f0b36a";
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (body.current) body.current.scale.set(0.3, 0.14 + Math.sin(t * 1.3) * 0.006, 0.2);
    zs.current.forEach((s, i) => {
      if (!s) return;
      const p = (t * 0.22 + i / 3) % 1;
      s.position.set(0.28 + p * 0.18, 0.28 + p * 0.45, 0.06);
      s.scale.setScalar(0.12 + p * 0.14);
      (s.material as THREE.SpriteMaterial).opacity = Math.sin(p * Math.PI) * 0.95;
    });
  });
  return (
    <group position={position} rotation={[0, -0.7, 0]}>
      <ShadowGroup>
        <mesh ref={body} position={[0, 0.13, 0]} scale={[0.3, 0.14, 0.2]}>
          <sphereGeometry args={[1, 28, 28]} />
          <meshStandardMaterial color={fur} roughness={0.95} />
        </mesh>
        {[-0.08, 0.02, 0.1].map((x, i) => (
          <mesh key={i} position={[x, 0.26, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1]}>
            <torusGeometry args={[0.03, 0.006, 6, 12, Math.PI]} />
            <meshStandardMaterial color="#d98b43" />
          </mesh>
        ))}
        <mesh position={[0.3, 0.11, 0.05]}>
          <sphereGeometry args={[0.105, 24, 24]} />
          <meshStandardMaterial color={fur} roughness={0.95} />
        </mesh>
        {[0, 0.11].map((z, i) => (
          <mesh key={i} position={[0.29, 0.21, 0.0 + z]} rotation={[0, 0, -0.15]}>
            <coneGeometry args={[0.038, 0.075, 8]} />
            <meshStandardMaterial color={fur} roughness={0.95} />
          </mesh>
        ))}
        <mesh position={[0.395, 0.1, 0.05]} scale={[0.5, 0.6, 0.6]}>
          <sphereGeometry args={[0.03, 10, 10]} />
          <meshStandardMaterial color="#f7d6b8" />
        </mesh>
        <mesh position={[-0.28, 0.07, 0.14]} rotation={[0, 0.6, 0]}>
          <torusGeometry args={[0.16, 0.03, 10, 24, Math.PI * 1.1]} />
          <meshStandardMaterial color={fur} roughness={0.95} />
        </mesh>
      </ShadowGroup>
      {[0, 1, 2].map((i) => (
        <sprite
          key={i}
          ref={(el) => {
            zs.current[i] = el;
          }}
        >
          <spriteMaterial map={tex.zee} transparent depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

/* =====================================================
   家具
   ===================================================== */
/** ベッド。children には上に乗る住人を渡す */
function Bed({ children }: { children?: ReactNode }) {
  return (
    <group>
      <ShadowGroup>
        {/* フレーム・脚 */}
        <RoundedBox args={[2.75, 0.28, 2.0]} radius={0.05} smoothness={4} position={[1.55, 0.31, -2.0]}>
          <meshStandardMaterial color="#c98f52" roughness={0.75} />
        </RoundedBox>
        {[
          [0.3, -2.95],
          [2.8, -2.95],
          [0.3, -1.05],
          [2.8, -1.05],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.08, z]}>
            <cylinderGeometry args={[0.06, 0.05, 0.17, 12]} />
            <meshStandardMaterial color="#a8703a" />
          </mesh>
        ))}
        {/* ヘッドボード・フットボード */}
        <RoundedBox args={[0.1, 1.0, 2.0]} radius={0.04} smoothness={4} position={[0.22, 0.75, -2.0]}>
          <meshStandardMaterial color="#b8783f" roughness={0.75} />
        </RoundedBox>
        <RoundedBox args={[0.1, 0.55, 2.0]} radius={0.04} smoothness={4} position={[2.88, 0.55, -2.0]}>
          <meshStandardMaterial color="#b8783f" roughness={0.75} />
        </RoundedBox>
        {/* マットレス */}
        <RoundedBox args={[2.6, 0.3, 1.9]} radius={0.1} smoothness={6} position={[1.55, 0.58, -2.0]}>
          <meshStandardMaterial color="#f6ead0" roughness={1} />
        </RoundedBox>
        {/* 掛け布団（縞） */}
        {[0, 1, 2, 3, 4].map((i) => (
          <RoundedBox key={i} args={[0.19, 0.12, 1.96]} radius={0.05} smoothness={4} position={[1.95 + i * 0.19, 0.76, -2.0]}>
            <meshStandardMaterial color={i % 2 ? "#e9dca2" : "#7fa35f"} roughness={1} />
          </RoundedBox>
        ))}
        <RoundedBox args={[0.95, 0.5, 0.06]} radius={0.03} smoothness={4} position={[2.42, 0.53, -1.04]}>
          <meshStandardMaterial color="#7fa35f" roughness={1} />
        </RoundedBox>
        {/* 枕 */}
        <RoundedBox args={[0.7, 0.2, 0.42]} radius={0.09} smoothness={6} position={[0.62, 0.84, -2.5]} rotation={[0, 0.12, 0]}>
          <meshStandardMaterial color="#f9e2b6" roughness={1} />
        </RoundedBox>
        <RoundedBox args={[0.5, 0.45, 0.17]} radius={0.07} smoothness={6} position={[1.4, 0.98, -2.88]} rotation={[0.12, 0, 0]}>
          <meshStandardMaterial color="#f2d3a4" roughness={1} />
        </RoundedBox>
        <RoundedBox args={[0.5, 0.45, 0.17]} radius={0.07} smoothness={6} position={[1.0, 0.98, -2.88]} rotation={[0.12, 0.2, 0.08]}>
          <meshStandardMaterial color="#cfe0b0" roughness={1} />
        </RoundedBox>
        <Bear position={[0.62, 0.95, -1.55]} rotY={0.5} />
        <Bear position={[0.95, 0.73, -1.35]} color="#e6b98a" scale={1.1} rotY={0.1} />
        <Bear position={[0.3, 0.73, -1.28]} color="#cfa27f" scale={0.85} rotY={0.9} />
      </ShadowGroup>
      {children}
    </group>
  );
}

function Desk({ tex }: { tex: Tex }) {
  return (
    <group>
      <ShadowGroup>
        {/* 天板と脚（左の壁沿い） */}
        <RoundedBox args={[0.85, 0.07, 2.0]} radius={0.025} smoothness={4} position={[-2.55, 0.8, -1.2]}>
          <meshStandardMaterial color="#e0aa70" roughness={0.7} />
        </RoundedBox>
        {[
          [-2.9, -2.1],
          [-2.9, -0.3],
          [-2.2, -2.1],
          [-2.2, -0.3],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.38, z]}>
            <boxGeometry args={[0.07, 0.76, 0.07]} />
            <meshStandardMaterial color={C.woodDark} roughness={0.8} />
          </mesh>
        ))}
        {/* 引き出し */}
        <RoundedBox args={[0.7, 0.28, 0.6]} radius={0.03} smoothness={4} position={[-2.55, 0.62, -0.62]}>
          <meshStandardMaterial color="#d09a5f" roughness={0.75} />
        </RoundedBox>
        {/* モニター */}
        <RoundedBox args={[0.08, 0.56, 0.9]} radius={0.03} smoothness={4} position={[-2.78, 1.2, -1.45]}>
          <meshStandardMaterial color="#26362d" roughness={0.5} />
        </RoundedBox>
        <mesh position={[-2.735, 1.2, -1.45]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.82, 0.48]} />
          <meshStandardMaterial map={tex.screen} emissiveMap={tex.screen} emissive="#ffffff" emissiveIntensity={1.1} toneMapped={false} />
        </mesh>
        <mesh position={[-2.78, 0.88, -1.45]}>
          <cylinderGeometry args={[0.1, 0.12, 0.04, 20]} />
          <meshStandardMaterial color="#26362d" />
        </mesh>
        {/* キーボード・ノート */}
        <RoundedBox args={[0.2, 0.02, 0.55]} radius={0.01} smoothness={3} position={[-2.46, 0.85, -1.45]}>
          <meshStandardMaterial color="#efe9d6" roughness={0.6} />
        </RoundedBox>
        <RoundedBox args={[0.3, 0.02, 0.4]} radius={0.01} smoothness={3} position={[-2.4, 0.84, -0.55]} rotation={[0, 0.2, 0]}>
          <meshStandardMaterial color="#fdf6e3" />
        </RoundedBox>
        {/* 本の山 */}
        {[
          ["#e76f51", 0.4],
          ["#2a9d8f", 0.34],
          ["#e9c46a", 0.3],
        ].map(([c, w], i) => (
          <RoundedBox key={i} args={[Number(w), 0.05, 0.24]} radius={0.015} smoothness={3} position={[-2.6, 0.86 + i * 0.05, -2.0]} rotation={[0, i * 0.2, 0]}>
            <meshStandardMaterial color={String(c)} roughness={0.8} />
          </RoundedBox>
        ))}
        {/* ペン立て */}
        <mesh position={[-2.3, 0.89, -1.9]}>
          <cylinderGeometry args={[0.045, 0.04, 0.1, 16]} />
          <meshStandardMaterial color="#8ab17d" />
        </mesh>
        {[-0.015, 0.015].map((dz, i) => (
          <mesh key={i} position={[-2.3, 0.97, -1.9 + dz]} rotation={[dz * 6, 0, dz * 5]}>
            <cylinderGeometry args={[0.005, 0.005, 0.14, 6]} />
            <meshStandardMaterial color={i ? "#e63946" : "#457b9d"} />
          </mesh>
        ))}
      </ShadowGroup>
      <Candle position={[-2.5, 0.835, -0.25]} tex={tex} />
      <Candle position={[-2.32, 0.835, -0.12]} phase={1.3} tex={tex} />
      <Plant position={[-2.7, 0.835, -2.05]} scale={0.6} phase={0.7} />
    </group>
  );
}

function Chair() {
  return (
    <group position={[-1.7, 0, -1.2]} rotation={[0, -Math.PI / 2 + 0.25, 0]}>
      <ShadowGroup>
        <RoundedBox args={[0.6, 0.1, 0.55]} radius={0.05} smoothness={5} position={[0, 0.5, 0]}>
          <meshStandardMaterial color="#f0e4cd" roughness={1} />
        </RoundedBox>
        <RoundedBox args={[0.58, 0.55, 0.1]} radius={0.06} smoothness={5} position={[0, 0.85, -0.3]} rotation={[-0.12, 0, 0]}>
          <meshStandardMaterial color="#e8dbc2" roughness={1} />
        </RoundedBox>
        {[
          [-0.24, -0.2],
          [0.24, -0.2],
          [-0.24, 0.2],
          [0.24, 0.2],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.23, z]}>
            <cylinderGeometry args={[0.025, 0.02, 0.46, 10]} />
            <meshStandardMaterial color="#c9a27a" />
          </mesh>
        ))}
      </ShadowGroup>
    </group>
  );
}

function Shelf({ tex }: { tex: Tex }) {
  const books = useMemo(() => {
    const colors = ["#e76f51", "#2a9d8f", "#e9c46a", "#264653", "#f4a261", "#8ab17d", "#b5838d"];
    return Array.from({ length: 6 }, (_, i) => ({ h: 0.22 + (i % 3) * 0.05, w: 0.05 + (i % 2) * 0.02, c: colors[(i * 2) % colors.length] }));
  }, []);
  let bx = -0.25;
  return (
    <group>
      <ShadowGroup>
        <RoundedBox args={[0.34, 0.05, 2.5]} radius={0.015} smoothness={3} position={[-2.82, 2.15, -1.0]}>
          <meshStandardMaterial color="#c58b4e" roughness={0.75} />
        </RoundedBox>
        {[-2.1, 0.1].map((z) => (
          <mesh key={z} position={[-2.9, 2.03, z]}>
            <boxGeometry args={[0.06, 0.18, 0.05]} />
            <meshStandardMaterial color={C.woodDark} />
          </mesh>
        ))}
        <RoundedBox args={[0.34, 0.05, 1.7]} radius={0.015} smoothness={3} position={[-2.82, 2.9, -1.4]}>
          <meshStandardMaterial color="#c58b4e" roughness={0.75} />
        </RoundedBox>
        {/* 本 */}
        {books.map((b, i) => {
          bx += b.w + 0.008;
          return (
            <mesh key={i} position={[-2.82, 2.175 + b.h / 2, bx - 1.0]}>
              <boxGeometry args={[0.2, b.h, b.w]} />
              <meshStandardMaterial color={b.c} roughness={0.8} />
            </mesh>
          );
        })}
      </ShadowGroup>
      <Plant position={[-2.82, 2.175, -2.05]} scale={0.7} phase={0.3} />
      <Plant position={[-2.82, 2.175, 0.0]} scale={0.6} phase={1.9} pot="#c9a27a" />
      <Plant position={[-2.82, 2.925, -2.0]} scale={0.65} phase={2.2} />
      <Plant position={[-2.82, 2.925, -1.1]} scale={0.55} phase={0.9} pot="#c9a27a" />
      {/* 壁掛けの絵 */}
      <group position={[-2.9, 1.9, 1.0]} rotation={[0, Math.PI / 2, 0]}>
        <ShadowGroup>
          <RoundedBox args={[0.95, 0.75, 0.05]} radius={0.02} smoothness={3}>
            <meshStandardMaterial color="#c58b4e" roughness={0.7} />
          </RoundedBox>
        </ShadowGroup>
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[0.82, 0.62]} />
          <meshStandardMaterial map={tex.picture} roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

function SideTable({ tex }: { tex: Tex }) {
  const flicker = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (flicker.current) flicker.current.intensity = 5.5 + Math.sin(clock.elapsedTime * 3) * 0.4 + Math.sin(clock.elapsedTime * 7.3) * 0.25;
  });
  return (
    <group>
      <ShadowGroup>
        <RoundedBox args={[0.75, 0.62, 0.6]} radius={0.04} smoothness={4} position={[2.55, 0.34, -0.5]}>
          <meshStandardMaterial color="#c98f52" roughness={0.75} />
        </RoundedBox>
        {[-0.12, 0.12].map((dy, i) => (
          <mesh key={i} position={[2.55, 0.34 + dy, -0.195]}>
            <boxGeometry args={[0.6, 0.02, 0.01]} />
            <meshStandardMaterial color="#8a5a2b" />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[2.55 + s * 0.3, 0.0 + 0.02, -0.5 + s * 0.2]}>
            <cylinderGeometry args={[0.03, 0.025, 0.04, 8]} />
            <meshStandardMaterial color="#8a5a2b" />
          </mesh>
        ))}
        {/* ランプ */}
        <mesh position={[2.55, 0.67, -0.55]}>
          <cylinderGeometry args={[0.08, 0.09, 0.03, 20]} />
          <meshStandardMaterial color="#8a5a2b" />
        </mesh>
        <mesh position={[2.55, 0.82, -0.55]}>
          <cylinderGeometry args={[0.012, 0.012, 0.28, 8]} />
          <meshStandardMaterial color="#8a5a2b" />
        </mesh>
        <mesh position={[2.55, 1.05, -0.55]}>
          <cylinderGeometry args={[0.12, 0.2, 0.22, 24, 1, true]} />
          <meshStandardMaterial color="#ffdc8a" emissive="#ffc766" emissiveIntensity={0.9} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
        {/* 小さな花 */}
        <mesh position={[2.3, 0.7, -0.3]}>
          <cylinderGeometry args={[0.04, 0.035, 0.08, 14]} />
          <meshStandardMaterial color="#f3e9d9" />
        </mesh>
      </ShadowGroup>
      {[
        [2.3, 0.82, -0.3, "#f28482"],
        [2.34, 0.8, -0.28, "#f6bd60"],
        [2.27, 0.8, -0.32, "#f5cac3"],
      ].map(([x, y, z, c], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshStandardMaterial color={c as string} roughness={0.8} />
        </mesh>
      ))}
      <pointLight ref={flicker} position={[2.55, 1.05, -0.55]} color="#ffbf66" intensity={5.5} distance={5} decay={2} />
      <Glow position={[2.55, 1.05, -0.55]} color="#ffc766" size={1.1} opacity={0.35} map={tex.glow} />
    </group>
  );
}

function Backpack() {
  return (
    <group position={[1.7, 0, -0.35]} rotation={[0, 0.5, 0]}>
      <ShadowGroup>
        <RoundedBox args={[0.38, 0.5, 0.22]} radius={0.09} smoothness={5} position={[0, 0.25, 0]} rotation={[-0.08, 0, 0]}>
          <meshStandardMaterial color="#5f8a5a" roughness={0.9} />
        </RoundedBox>
        <RoundedBox args={[0.3, 0.2, 0.08]} radius={0.04} smoothness={4} position={[0, 0.15, 0.13]}>
          <meshStandardMaterial color="#4d7549" roughness={0.9} />
        </RoundedBox>
        <mesh position={[0, 0.52, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.04, 0.012, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#3f6340" />
        </mesh>
      </ShadowGroup>
    </group>
  );
}

function Rug() {
  const rings: [number, string][] = [
    [1.35, "#5f8f4f"],
    [1.1, "#efe2b0"],
    [0.85, "#79a866"],
  ];
  return (
    <group position={[-0.1, 0, 1.0]}>
      {rings.map(([r, c], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006 + i * 0.004, 0]} receiveShadow>
          <circleGeometry args={[r, 64]} />
          <meshStandardMaterial color={c} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* =====================================================
   窓・外の景色
   ===================================================== */
/** 外の景色は「窓の形」の中にだけ描く（ステンシル）。部屋の外側から見えてしまうのを防ぐ */
function Outside({ tex, portal }: { tex: Tex; portal: THREE.BufferGeometry }) {
  const leaves = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  useEffect(() => {
    root.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.material) {
        const mat = m.material as THREE.Material;
        mat.stencilWrite = true;
        mat.stencilRef = 1;
        mat.stencilFunc = THREE.EqualStencilFunc;
        mat.stencilFail = THREE.KeepStencilOp;
        mat.stencilZFail = THREE.KeepStencilOp;
        mat.stencilZPass = THREE.KeepStencilOp;
      }
      // Group に renderOrder を付けると並び順(groupOrder)が先に効いてしまうので、メッシュとスプライトだけに付ける
      if (m.isMesh || (o as THREE.Sprite).isSprite) o.renderOrder = -5;
    });
  }, []);
  useFrame(({ clock }) => {
    if (leaves.current) leaves.current.rotation.z = Math.sin(clock.elapsedTime * 0.7) * 0.025;
  });
  return (
    <>
      <mesh geometry={portal} position={[0, 0, -3.05]} renderOrder={-10}>
        <meshBasicMaterial
          colorWrite={false}
          depthWrite={false}
          stencilWrite
          stencilRef={1}
          stencilFunc={THREE.AlwaysStencilFunc}
          stencilZPass={THREE.ReplaceStencilOp}
        />
      </mesh>
      <group ref={root} position={[WIN.cx, 0, -4.2]}>
      <mesh position={[0, 2.2, -1.2]}>
        <planeGeometry args={[16, 10]} />
        <meshBasicMaterial map={tex.sky} toneMapped={false} />
      </mesh>
      <Glow position={[0.7, 2.9, -1.1]} color="#fffbd0" size={3.2} opacity={0.9} map={tex.glow} />
      <mesh position={[0.7, 2.9, -1.0]}>
        <circleGeometry args={[0.28, 32]} />
        <meshBasicMaterial color="#fffbe0" toneMapped={false} />
      </mesh>
      {/* 丘 */}
      <mesh position={[-0.6, 0.6, -0.8]} scale={[3.4, 1.1, 1]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshStandardMaterial color="#6aa65f" roughness={1} />
      </mesh>
      <mesh position={[1.6, 0.3, -0.4]} scale={[3.2, 1.0, 1]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshStandardMaterial color="#4f8a4c" roughness={1} />
      </mesh>
      {/* 木 */}
      {[
        [-0.9, 1.8, 0.2, 0.55, "#3f7d46"],
        [-0.4, 1.7, 0.3, 0.7, "#4a8a4f"],
        [0.9, 1.45, 0.1, 0.6, "#3f7d46"],
        [1.7, 1.9, 0.2, 0.5, "#4f8a4c"],
      ].map(([x, y, z, r, c], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]}>
          <sphereGeometry args={[r as number, 20, 20]} />
          <meshStandardMaterial color={c as string} roughness={1} />
        </mesh>
      ))}
      {/* 手前でゆれる葉 */}
      <group ref={leaves} position={[-0.8, 3.3, 0.6]}>
        {[
          [0, 0, 0.38, "#4f8a4c"],
          [0.4, -0.3, 0.3, "#5f9d57"],
          [-0.35, -0.35, 0.28, "#3f7d46"],
        ].map(([x, y, r, c], i) => (
          <mesh key={i} position={[x as number, y as number, 0]}>
            <sphereGeometry args={[r as number, 16, 16]} />
            <meshStandardMaterial color={c as string} roughness={1} />
          </mesh>
        ))}
      </group>
      </group>
    </>
  );
}

/** 壁（アーチ窓の穴付き）と窓枠 */
function Walls({ tex }: { tex: Tex }) {
  const wallpaper = getWallpaper(useAppSelector(selectWallpaper));
  const { backGeo, leftGeo, frameGeo, portalGeo } = useMemo(() => {
    const span = 3 + WALL_T; // 壁は床の外側まで
    const addArch = (p: THREE.Path, w: number, bottom: number) => {
      p.moveTo(WIN.cx - w, bottom);
      p.lineTo(WIN.cx + w, bottom);
      p.lineTo(WIN.cx + w, WIN.spring);
      p.absarc(WIN.cx, WIN.spring, w, 0, Math.PI, false);
      p.lineTo(WIN.cx - w, bottom);
    };
    const back = new THREE.Shape();
    back.moveTo(-span, 0);
    back.lineTo(3, 0);
    back.lineTo(3, WALL_H);
    back.lineTo(-span, WALL_H);
    back.closePath();
    const hole = new THREE.Path();
    addArch(hole, WIN.w, WIN.bottom);
    back.holes.push(hole);
    const backGeo = new THREE.ExtrudeGeometry(back, { depth: WALL_T, bevelEnabled: false });

    const left = new THREE.Shape();
    left.moveTo(-3, 0);
    left.lineTo(3, 0);
    left.lineTo(3, WALL_H);
    left.lineTo(-3, WALL_H);
    left.closePath();
    const leftGeo = new THREE.ExtrudeGeometry(left, { depth: WALL_T, bevelEnabled: false });

    const frame = new THREE.Shape();
    const fw = WIN.w + 0.1;
    frame.moveTo(WIN.cx - fw, WIN.bottom - 0.1);
    frame.lineTo(WIN.cx + fw, WIN.bottom - 0.1);
    frame.lineTo(WIN.cx + fw, WIN.spring);
    frame.absarc(WIN.cx, WIN.spring, fw, 0, Math.PI, false);
    frame.closePath();
    const fh = new THREE.Path();
    addArch(fh, WIN.w, WIN.bottom);
    frame.holes.push(fh);
    const frameGeo = new THREE.ExtrudeGeometry(frame, { depth: 0.26, bevelEnabled: false });
    const portal = new THREE.Shape();
    addArch(portal, WIN.w, WIN.bottom);
    const portalGeo = new THREE.ShapeGeometry(portal);
    return { backGeo, leftGeo, frameGeo, portalGeo };
  }, []);

  // 左の壁は少しだけ暗くして、奥の壁と区別がつくようにする（壁紙を変えたらマテリアルを作り直す）
  const wallA = <meshStandardMaterial key={`a-${wallpaper.color}-${wallpaper.map?.id}`} attach="material-0" map={wallpaper.map} color={wallpaper.color} roughness={1} />;
  const wallB = (
    <meshStandardMaterial
      key={`b-${wallpaper.color}-${wallpaper.map?.id}`}
      attach="material-0"
      map={wallpaper.map}
      color={new THREE.Color(wallpaper.color).multiplyScalar(0.88)}
      roughness={1}
    />
  );
  const edge = <meshStandardMaterial attach="material-1" color="#efe4c6" roughness={0.9} />;

  return (
    <group>
      {/* 床 */}
      <mesh position={[-0.09, -0.15, -0.09]} receiveShadow>
        <boxGeometry args={[6.18, 0.3, 6.18]} />
        <meshStandardMaterial attach="material-0" color="#6b4a2b" />
        <meshStandardMaterial attach="material-1" color="#6b4a2b" />
        <meshStandardMaterial attach="material-2" map={tex.wood} roughness={0.6} />
        <meshStandardMaterial attach="material-3" color="#4a3019" />
        <meshStandardMaterial attach="material-4" color="#6b4a2b" />
        <meshStandardMaterial attach="material-5" color="#6b4a2b" />
      </mesh>

      {/* 奥の壁 */}
      <mesh geometry={backGeo} position={[0, 0, -3 - WALL_T]} castShadow receiveShadow>
        {wallA}
        {edge}
      </mesh>
      {/* 左の壁 */}
      <mesh geometry={leftGeo} position={[-3 - WALL_T, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        {wallB}
        {edge}
      </mesh>

      {/* 腰壁と巾木 */}
      <mesh position={[0, 0.45, -2.985]} receiveShadow>
        <boxGeometry args={[6, 0.9, 0.03]} />
        <meshStandardMaterial color={wallpaper.wainscot} roughness={0.9} />
      </mesh>
      <mesh position={[-2.985, 0.45, 0]} receiveShadow>
        <boxGeometry args={[0.03, 0.9, 6]} />
        <meshStandardMaterial color={new THREE.Color(wallpaper.wainscot).multiplyScalar(0.95)} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.92, -2.97]}>
        <boxGeometry args={[6, 0.04, 0.06]} />
        <meshStandardMaterial color={wallpaper.rail} />
      </mesh>
      <mesh position={[-2.97, 0.92, 0]}>
        <boxGeometry args={[0.06, 0.04, 6]} />
        <meshStandardMaterial color={wallpaper.rail} />
      </mesh>
      <mesh position={[0, 0.06, -2.96]}>
        <boxGeometry args={[6, 0.12, 0.08]} />
        <meshStandardMaterial color="#fffaf2" />
      </mesh>
      <mesh position={[-2.96, 0.06, 0]}>
        <boxGeometry args={[0.08, 0.12, 6]} />
        <meshStandardMaterial color="#fffaf2" />
      </mesh>

      {/* 窓枠 */}
      <mesh geometry={frameGeo} position={[0, 0, -3.13]} castShadow>
        <meshStandardMaterial color="#d6a064" roughness={0.7} />
      </mesh>
      <mesh position={[WIN.cx, (WIN.bottom + WIN.spring + WIN.w) / 2, -3.0]}>
        <boxGeometry args={[0.05, WIN.spring + WIN.w - WIN.bottom, 0.06]} />
        <meshStandardMaterial color="#d6a064" />
      </mesh>
      <mesh position={[WIN.cx, 1.95, -3.0]}>
        <boxGeometry args={[WIN.w * 2, 0.05, 0.06]} />
        <meshStandardMaterial color="#d6a064" />
      </mesh>
      {/* 窓台 */}
      <RoundedBox args={[2.5, 0.08, 0.4]} radius={0.03} smoothness={3} position={[WIN.cx, WIN.bottom - 0.12, -2.82]} castShadow>
        <meshStandardMaterial color="#d6a064" roughness={0.7} />
      </RoundedBox>

      <Outside tex={tex} portal={portalGeo} />
    </group>
  );
}

/* =====================================================
   イルミネーション・ホタル
   ===================================================== */
function FairyBulb({ position, phase, tex }: { position: V3; phase: number; tex: Tex }) {
  const s = useRef<THREE.Sprite>(null);
  useFrame(({ clock }) => {
    if (s.current) {
      const k = 0.55 + 0.45 * Math.sin(clock.elapsedTime * 2.2 + phase);
      s.current.scale.setScalar(0.18 + k * 0.1);
      (s.current.material as THREE.SpriteMaterial).opacity = 0.35 + k * 0.6;
    }
  });
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshBasicMaterial color="#ffe6a0" toneMapped={false} />
      </mesh>
      <sprite ref={s} scale={[0.25, 0.25, 1]}>
        <spriteMaterial map={tex.glow} color="#ffd27a" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

function FairyLights({ from, to, tex }: { from: V3; to: V3; tex: Tex }) {
  const { pts, curve } = useMemo(() => {
    const f = new THREE.Vector3(...from);
    const t = new THREE.Vector3(...to);
    const n = 13;
    const pts: V3[] = [];
    const ctrl: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const p = f.clone().lerp(t, k);
      p.y -= Math.sin(k * Math.PI) * 0.22;
      ctrl.push(p);
      if (i % 1 === 0 && i > 0 && i < n) pts.push([p.x, p.y - 0.03, p.z]);
    }
    return { pts, curve: new THREE.CatmullRomCurve3(ctrl) };
  }, [from, to]);
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 48, 0.007, 5, false]} />
        <meshStandardMaterial color="#4a3a22" />
      </mesh>
      {pts.map((p, i) => (
        <FairyBulb key={i} position={p} phase={i * 0.9} tex={tex} />
      ))}
    </group>
  );
}

function Fireflies({ tex }: { tex: Tex }) {
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  const data = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        base: [(((i * 53) % 100) / 100 - 0.5) * 3.6, 0.8 + (((i * 37) % 100) / 100) * 2, (((i * 71) % 100) / 100 - 0.5) * 3.6] as V3,
        sp: 0.25 + ((i * 13) % 10) / 40,
        ph: i * 1.7,
        amp: 0.2 + ((i * 7) % 10) / 40,
      })),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    data.forEach((d, i) => {
      const s = refs.current[i];
      if (!s) return;
      s.position.set(d.base[0] + Math.sin(t * d.sp + d.ph) * d.amp * 1.6, d.base[1] + Math.sin(t * d.sp * 1.3 + d.ph) * d.amp, d.base[2] + Math.cos(t * d.sp * 0.9 + d.ph) * d.amp * 1.6);
      const k = 0.5 + 0.5 * Math.sin(t * 1.6 + d.ph * 2);
      s.scale.setScalar(0.07 + k * 0.07);
      (s.material as THREE.SpriteMaterial).opacity = 0.2 + k * 0.8;
    });
  });
  return (
    <group>
      {data.map((_, i) => (
        <sprite
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <spriteMaterial map={tex.glow} color="#fff6a8" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  );
}

/* =====================================================
   シーン
   ===================================================== */
/** ベッドを部屋に出していればベッドの上、しまっていれば床に座る位置 */
const RESIDENT_ON_BED: V3 = [1.45, 0.73, -2.38];
const RESIDENT_ON_FLOOR: V3 = [1.0, 0, -2.0];

function Scene() {
  const tex = useTextures();
  const avatar = useAppSelector(selectAvatar);
  const bedPlaced = useAppSelector((s) => selectIsPlaced(s, "bed"));
  return (
    <>
      <hemisphereLight args={["#f2f6e2", "#a58563", 1.15]} />
      {/* 窓から差し込む光 */}
      <directionalLight
        position={[3.5, 6, -9]}
        intensity={2.2}
        color="#ffe9b8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={25}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <pointLight position={[-2.3, 1.2, -0.2]} color="#ffb866" intensity={2.2} distance={3.5} decay={2} />

      <Walls tex={tex} />
      <Shelf tex={tex} />

      {/* ドラッグで動かせて、バッグに出し入れできる家具 */}
      <Draggable id="rug">
        <Rug />
      </Draggable>
      <Draggable id="cat">
        <Cat position={[-0.1, 0.012, 1.0]} tex={tex} />
      </Draggable>
      <Draggable id="backpack">
        <Backpack />
      </Draggable>
      <Draggable id="bed">
        <Bed>
          <Resident avatar={avatar} position={RESIDENT_ON_BED} />
        </Bed>
      </Draggable>
      {!bedPlaced && <Resident avatar={avatar} position={RESIDENT_ON_FLOOR} />}
      <Draggable id="desk">
        <Desk tex={tex} />
      </Draggable>
      <Draggable id="chair">
        <Chair />
      </Draggable>
      <Draggable id="sideTable">
        <SideTable tex={tex} />
      </Draggable>
      <Draggable id="plantRight">
        <ShadowGroup>
          <Plant position={[2.5, 0, 1.9]} scale={1.6} phase={0.5} pot="#c9a27a" />
        </ShadowGroup>
      </Draggable>
      <Draggable id="plantLeft">
        <ShadowGroup>
          <Plant position={[-2.45, 0, 2.2]} scale={1.4} phase={1.6} />
        </ShadowGroup>
      </Draggable>
      <Draggable id="bookshelf">
        <Bookshelf />
      </Draggable>
      <Draggable id="sofa">
        <Sofa />
      </Draggable>
      <Draggable id="beanbag">
        <Beanbag />
      </Draggable>
      <Draggable id="lowTable">
        <LowTable glow={tex.glow} />
      </Draggable>
      <Draggable id="floorLamp">
        <FloorLamp glow={tex.glow} />
      </Draggable>
      <Draggable id="guitar">
        <Guitar />
      </Draggable>
      <Draggable id="fishbowl">
        <Fishbowl />
      </Draggable>
      <Draggable id="cactus">
        <Cactus />
      </Draggable>

      <ShadowGroup>
        <Plant position={[WIN.cx - 0.55, WIN.bottom - 0.08, -2.82]} scale={0.8} phase={1} />
        <Plant position={[WIN.cx + 0.55, WIN.bottom - 0.08, -2.82]} scale={0.7} phase={2.4} pot="#c9a27a" />
      </ShadowGroup>
      <HangingPlant position={[WIN.cx - 0.55, 3.1, -2.75]} />
      <HangingPlant position={[WIN.cx + 0.6, 3.1, -2.75]} phase={1.8} />

      <FairyLights from={[-2.9, 3.4, -2.88]} to={[2.9, 3.4, -2.88]} tex={tex} />
      <FairyLights from={[-2.88, 3.4, -2.9]} to={[-2.88, 3.4, 2.9]} tex={tex} />
      <Fireflies tex={tex} />
    </>
  );
}

/** 画面の縦横比に合わせてズームし、縦長の画面でも部屋が切れないようにする */
function FitToScreen() {
  // three.js のカメラは React の state ではなく外部のオブジェクトなので、
  // hook の戻り値を直接書き換えず、effect の中で get() から取り出して更新する
  const get = useThree((s) => s.get);
  const aspect = useThree((s) => s.size.width / s.size.height);
  useEffect(() => {
    const camera = get().camera as THREE.PerspectiveCamera;
    camera.zoom = Math.min(1, aspect / 1.2);
    camera.updateProjectionMatrix();
  }, [get, aspect]);
  return null;
}

export default function Room() {
  const [touched, setTouched] = useState(false);
  const dispatch = useAppDispatch();
  // ログイン中なら、その人の部屋（家具の配置・壁紙・住人）を読み込む
  useRoomSync();
  return (
    <div className="room-container">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, stencil: true }}
        camera={{ position: [9.8, 7.4, 9.8], fov: 32, near: 0.5, far: 90 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
        }}
        onPointerDown={() => setTouched(true)}
        // 家具以外をクリックしたら、選んでいた家具の選択を外す
        onPointerMissed={() => dispatch(selectFurniture(null))}
      >
        <Scene />
        <FitToScreen />
        <OrbitControls
          makeDefault
          target={[0, 1.2, 0]}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.7}
          minDistance={8}
          maxDistance={26}
          minPolarAngle={0.5}
          maxPolarAngle={1.4}
          minAzimuthAngle={-0.2}
          maxAzimuthAngle={Math.PI / 2 + 0.2}
        />
      </Canvas>
      <div className={`room-hint${touched ? " is-hidden" : ""}`}>ドラッグで回転 / ホイールでズーム</div>
      <LayoutToolbar />
    </div>
  );
}
