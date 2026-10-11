import { useMemo, useRef } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Glow, ShadowGroup } from "../shared";
import { roundedSlab, softBox } from "../geometry";
import { makeTexture } from "../utils";
import { Emissive, Fabric, Glass, Matte, Metal, Wood } from "./common";

/* =====================================================
   「田舎の夕暮れ」テーマの家具。たたみ・ふとん・ちゃぶ台・行灯の和室にする
   ===================================================== */

const COL = {
  cedar: "#b07a4a",
  cedarDark: "#7a4f2e",
  paper: "#f6ecd6",
  indigo: "#2f4a7a",
  tatami: "#c9c27a",
  heri: "#2f4a3a",
  red: "#b5402f",
};

/** テクスチャは一度だけ作って、同じテーマの家具で使い回す */
let cached: ReturnType<typeof buildCountryTextures> | null = null;
function buildCountryTextures() {
    // たたみの目
    const tatami = makeTexture(128, 256, (g, w, h) => {
      g.fillStyle = "#cbc27c";
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 3) {
        g.fillStyle = y % 6 ? "rgba(120,110,40,0.12)" : "rgba(255,255,220,0.12)";
        g.fillRect(0, y, w, 2);
      }
    });
    // 麻の葉もようのかけぶとん
    const asanoha = makeTexture(256, 256, (g, w, h) => {
      g.fillStyle = "#2f4a7a";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(240,236,220,0.55)";
      g.lineWidth = 2;
      const s = 32;
      for (let y = 0; y <= h; y += s) {
        for (let x = 0; x <= w; x += s) {
          g.beginPath();
          g.moveTo(x - s / 2, y);
          g.lineTo(x + s / 2, y);
          g.moveTo(x, y - s / 2);
          g.lineTo(x, y + s / 2);
          g.moveTo(x - s / 2, y - s / 2);
          g.lineTo(x + s / 2, y + s / 2);
          g.moveTo(x + s / 2, y - s / 2);
          g.lineTo(x - s / 2, y + s / 2);
          g.stroke();
        }
      }
    });
    asanoha.wrapS = asanoha.wrapT = THREE.RepeatWrapping;
    asanoha.repeat.set(2, 2);
    // すだれ（竹のすじ）
    const sudare = makeTexture(64, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4) {
        g.fillStyle = `rgba(${170 + ((y * 7) % 20)},${130 + ((y * 5) % 20)},70,0.92)`;
        g.fillRect(0, y, w, 3);
      }
      g.fillStyle = "rgba(60,40,20,0.8)";
      [10, 32, 54].forEach((x) => g.fillRect(x, 0, 2, h));
    });
    // 掛け軸
    const scroll = makeTexture(128, 320, (g, w, h) => {
      g.fillStyle = "#efe6cf";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#2a2a2a";
      g.font = "700 56px serif";
      g.textAlign = "center";
      ["一", "期", "一", "会"].forEach((c, i) => g.fillText(c, w / 2, 70 + i * 64));
      g.fillStyle = "#b5402f";
      g.fillRect(w / 2 - 10, h - 40, 20, 20);
    });
    return { tatami, asanoha, sudare, scroll };
}
function useCountryTextures() {
  return useMemo(() => (cached ??= buildCountryTextures()), []);
}

/* ---------- 文机（ひくい机） ---------- */
export function LowDesk({ glow }: { glow: THREE.Texture }) {
  const top = useMemo(() => roundedSlab(0.7, 1.7, 0.05, 0.03), []);
  return (
    <group>
      <ShadowGroup>
        <mesh geometry={top} position={[-2.5, 0.36, -1.25]}>
          <Wood color={COL.cedar} />
        </mesh>
        {[-2.05, -0.45].map((z) => (
          <RoundedBox key={z} args={[0.62, 0.33, 0.06]} radius={0.015} smoothness={3} position={[-2.5, 0.17, z]}>
            <Wood color={COL.cedarDark} />
          </RoundedBox>
        ))}
        <RoundedBox args={[0.5, 0.08, 0.6]} radius={0.01} smoothness={2} position={[-2.55, 0.29, -1.25]}>
          <Wood color={COL.cedarDark} />
        </RoundedBox>
        {/* 卓上のあかり（紙のかさ） */}
        <group position={[-2.7, 0.39, -1.9]}>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.06, 0.07, 0.03, 20]} />
            <Wood color={COL.cedarDark} />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.24, 24, 1, true]} />
            <meshStandardMaterial color={COL.paper} side={THREE.DoubleSide} emissive="#ffcf8a" emissiveIntensity={0.9} roughness={1} />
          </mesh>
        </group>
        {/* 本・ノート・湯のみ */}
        <RoundedBox args={[0.28, 0.02, 0.38]} radius={0.006} smoothness={2} position={[-2.4, 0.4, -1.2]} rotation={[0, 0.15, 0]}>
          <Matte color="#fbf6ea" roughness={0.9} />
        </RoundedBox>
        <RoundedBox args={[0.2, 0.05, 0.26]} radius={0.008} smoothness={2} position={[-2.62, 0.415, -0.65]} rotation={[0, -0.2, 0]}>
          <Matte color={COL.indigo} roughness={0.8} />
        </RoundedBox>
        <mesh position={[-2.35, 0.43, -1.62]}>
          <cylinderGeometry args={[0.035, 0.03, 0.08, 20]} />
          <meshPhysicalMaterial color="#6a7a5a" roughness={0.3} clearcoat={0.6} />
        </mesh>
      </ShadowGroup>
      <pointLight position={[-2.6, 0.7, -1.85]} color="#ffbf73" intensity={2.2} distance={2.5} decay={2} />
      <Glow position={[-2.7, 0.57, -1.9]} color="#ffc27a" size={0.8} opacity={0.35} map={glow} />
    </group>
  );
}

/* ---------- 座椅子 ---------- */
export function Zaisu({ children }: { children?: ReactNode }) {
  const geo = useMemo(
    () => ({
      seat: softBox(0.56, 0.1, 0.56, { radius: 0.04, puff: 0.03, wrinkle: 0.003 }),
      back: softBox(0.52, 0.5, 0.09, { radius: 0.04, puff: 0.02, seed: 51 }),
    }),
    [],
  );
  return (
    <group position={[-1.7, 0, -1.2]} rotation={[0, -Math.PI / 2 + 0.15, 0]}>
      <ShadowGroup>
        <mesh geometry={geo.seat} position={[0, 0.05, 0]}>
          <Fabric color={COL.red} />
        </mesh>
        <mesh geometry={geo.back} position={[0, 0.3, -0.3]} rotation={[-0.35, 0, 0]}>
          <Fabric color={COL.red} />
        </mesh>
      </ShadowGroup>
      {children}
    </group>
  );
}

/* ---------- ふとん ---------- */
export function Futon({ children }: { children?: ReactNode }) {
  const tex = useCountryTextures();
  const geo = useMemo(
    () => ({
      shiki: softBox(2.1, 0.1, 1.15, { radius: 0.05, puff: 0.01, density: 16 }),
      kake: softBox(1.6, 0.1, 1.25, { radius: 0.05, wrinkle: 0.012, puff: 0.05, seed: 61 }),
      fold: softBox(0.25, 0.1, 1.27, { radius: 0.045, wrinkle: 0.006, seed: 63 }),
      makura: softBox(0.3, 0.12, 0.5, { radius: 0.055, puff: 0.03, wrinkle: 0.004, seed: 65 }),
    }),
    [],
  );
  return (
    <group>
      <ShadowGroup>
        <mesh geometry={geo.shiki} position={[1.55, 0.05, -2.2]}>
          <Fabric color="#f2eee4" sheen={0.2} />
        </mesh>
        <mesh geometry={geo.kake} position={[1.85, 0.14, -2.2]}>
          <meshPhysicalMaterial color="#ffffff" map={tex.asanoha} roughness={0.95} sheen={0.6} sheenColor="#ffffff" />
        </mesh>
        <mesh geometry={geo.fold} position={[1.0, 0.15, -2.2]}>
          <Fabric color="#efe9da" />
        </mesh>
        <mesh geometry={geo.makura} position={[0.68, 0.16, -2.2]}>
          <Fabric color="#e8dcc0" />
        </mesh>
      </ShadowGroup>
      {children}
    </group>
  );
}

/* ---------- 行灯 ---------- */
export function Andon({ glow }: { glow: THREE.Texture }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (light.current) light.current.intensity = 3.2 + Math.sin(clock.elapsedTime * 2.3) * 0.2;
  });
  return (
    <group position={[2.55, 0, -0.5]}>
      <ShadowGroup>
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x * 0.15, 0.36, z * 0.15]}>
            <boxGeometry args={[0.03, 0.72, 0.03]} />
            <Wood color={COL.cedarDark} />
          </mesh>
        ))}
        {[0.06, 0.7].map((y) => (
          <RoundedBox key={y} args={[0.34, 0.03, 0.34]} radius={0.008} smoothness={2} position={[0, y, 0]}>
            <Wood color={COL.cedarDark} />
          </RoundedBox>
        ))}
      </ShadowGroup>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.28, 0.56, 0.28]} />
        <meshStandardMaterial color={COL.paper} emissive="#ffc77a" emissiveIntensity={1.4} roughness={1} />
      </mesh>
      <pointLight ref={light} position={[0, 0.45, 0]} color="#ffb766" intensity={3.2} distance={3.5} decay={2} />
      <Glow position={[0, 0.42, 0]} color="#ffc27a" size={1.3} opacity={0.4} map={glow} />
    </group>
  );
}

/* ---------- たたみ ---------- */
export function TatamiMats() {
  const tex = useCountryTextures();
  const mat = useMemo(() => softBox(0.9, 0.04, 1.8, { radius: 0.01, density: 10 }), []);
  return (
    <group position={[-0.1, 0.02, 1.0]}>
      {[
        [-0.46, 0, 0],
        [0.46, 0, 0],
      ].map(([x, , rot], i) => (
        <group key={i} position={[x, 0, 0]} rotation={[0, rot, 0]}>
          <mesh geometry={mat} receiveShadow>
            <meshStandardMaterial map={tex.tatami} roughness={0.9} />
          </mesh>
          {/* へり（長い辺の布） */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.43, 0.021, 0]} receiveShadow>
              <boxGeometry args={[0.04, 0.004, 1.8]} />
              <Matte color={COL.heri} roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ---------- 縁台（木のベンチ） ---------- */
export function Bench() {
  const top = useMemo(() => roundedSlab(1.5, 0.55, 0.05, 0.02), []);
  const zabuton = useMemo(() => softBox(0.5, 0.08, 0.48, { radius: 0.035, puff: 0.025, wrinkle: 0.003, seed: 71 }), []);
  return (
    <group position={[2.3, 0, 0.7]} rotation={[0, -Math.PI / 2, 0]}>
      <ShadowGroup>
        <mesh geometry={top} position={[0, 0.42, 0]}>
          <Wood color={COL.cedar} />
        </mesh>
        {[-0.65, 0.65].map((x) => (
          <RoundedBox key={x} args={[0.06, 0.4, 0.5]} radius={0.015} smoothness={2} position={[x, 0.2, 0]}>
            <Wood color={COL.cedarDark} />
          </RoundedBox>
        ))}
        {[-0.35, 0.35].map((x, i) => (
          <mesh key={x} geometry={zabuton} position={[x, 0.49, 0]} rotation={[0, i ? 0.1 : -0.05, 0]}>
            <Fabric color={i ? "#6a3f5a" : COL.indigo} />
          </mesh>
        ))}
      </ShadowGroup>
    </group>
  );
}

/* ---------- たんす ---------- */
export function Tansu() {
  return (
    <group position={[-2.72, 0, 0.6]} rotation={[0, Math.PI / 2, 0]}>
      <ShadowGroup>
        <RoundedBox args={[1.0, 1.1, 0.4]} radius={0.02} smoothness={3} position={[0, 0.55, 0]}>
          <Wood color={COL.cedar} />
        </RoundedBox>
        {[0.2, 0.47, 0.74, 0.98].map((y, row) =>
          (row === 3 ? [-0.25, 0.25] : [0]).map((x) => (
            <group key={`${y}${x}`}>
              <RoundedBox args={[row === 3 ? 0.44 : 0.92, row === 3 ? 0.18 : 0.22, 0.02]} radius={0.006} smoothness={2} position={[x, y, 0.205]}>
                <Wood color={COL.cedarDark} />
              </RoundedBox>
              <mesh position={[x, y, 0.22]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.035, 0.006, 8, 16, Math.PI]} />
                <Metal color="#2a2a2a" roughness={0.5} />
              </mesh>
            </group>
          )),
        )}
        {/* だるま */}
        <group position={[-0.25, 1.1, 0.02]}>
          <mesh position={[0, 0.1, 0]} scale={[1, 1.1, 1]}>
            <sphereGeometry args={[0.1, 24, 18]} />
            <meshPhysicalMaterial color="#c2342a" roughness={0.3} clearcoat={0.8} />
          </mesh>
          <mesh position={[0, 0.13, 0.085]} scale={[1, 0.8, 0.5]}>
            <sphereGeometry args={[0.055, 18, 14]} />
            <Matte color="#f6ecd6" roughness={0.4} />
          </mesh>
        </group>
        {/* 盆栽 */}
        <group position={[0.25, 1.1, 0.02]}>
          <RoundedBox args={[0.26, 0.06, 0.16]} radius={0.01} smoothness={2} position={[0, 0.03, 0]}>
            <Matte color="#3a3a44" roughness={0.4} />
          </RoundedBox>
          <mesh position={[0, 0.13, 0]} rotation={[0, 0, 0.4]}>
            <cylinderGeometry args={[0.012, 0.02, 0.16, 8]} />
            <Wood color="#5a3a22" />
          </mesh>
          {[
            [-0.04, 0.22, 0],
            [0.05, 0.2, 0.02],
            [-0.08, 0.17, -0.02],
          ].map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]} scale={[1, 0.6, 1]}>
              <sphereGeometry args={[0.055, 14, 10]} />
              <meshStandardMaterial color="#3f6a3a" roughness={0.9} />
            </mesh>
          ))}
        </group>
      </ShadowGroup>
    </group>
  );
}

/* ---------- ちゃぶ台とお茶 ---------- */
export function Chabudai() {
  const kyusu = useMemo(() => {
    const pts = [
      [0, 0],
      [0.06, 0.004],
      [0.08, 0.04],
      [0.075, 0.08],
      [0.04, 0.1],
      [0, 0.105],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 32);
  }, []);
  return (
    <group position={[-0.65, 0, 1.75]}>
      <ShadowGroup>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.04, 56]} />
          <Wood color={COL.cedarDark} />
        </mesh>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.28, 0.14, Math.sin(a) * 0.28]}>
              <cylinderGeometry args={[0.02, 0.02, 0.28, 10]} />
              <Wood color={COL.cedarDark} />
            </mesh>
          );
        })}
        <mesh geometry={kyusu} position={[0.05, 0.32, 0]}>
          <meshPhysicalMaterial color="#5a6a4a" roughness={0.35} clearcoat={0.5} />
        </mesh>
        <mesh position={[0.15, 0.38, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.012, 0.08, 4, 8]} />
          <Wood color="#5a3a22" />
        </mesh>
        {[
          [-0.18, 0.1],
          [-0.1, -0.2],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.36, z]}>
            <cylinderGeometry args={[0.032, 0.026, 0.07, 18]} />
            <meshPhysicalMaterial color="#e9e0cc" roughness={0.35} clearcoat={0.4} />
          </mesh>
        ))}
        {/* おせんべい */}
        <mesh position={[0.18, 0.33, -0.2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.01, 28]} />
          <Matte color="#d8d2c4" roughness={0.4} />
        </mesh>
        {[0, 1].map((i) => (
          <mesh key={i} position={[0.16 + i * 0.05, 0.345 + i * 0.008, -0.2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.01, 20]} />
            <Matte color="#b8823e" roughness={0.8} />
          </mesh>
        ))}
      </ShadowGroup>
    </group>
  );
}

/* ---------- ちょうちん型のフロアライト ---------- */
export function PaperLantern({ glow }: { glow: THREE.Texture }) {
  const shape = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const y = i / 20;
      pts.push(new THREE.Vector2(0.12 + Math.sin(y * Math.PI) * 0.1, y * 0.6));
    }
    return new THREE.LatheGeometry(pts, 40);
  }, []);
  return (
    <group position={[-0.55, 0, -2.6]}>
      <ShadowGroup>
        {[0.02, 0.9].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.04, 24]} />
            <Wood color="#2a1a10" />
          </mesh>
        ))}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.4, 8]} />
          <Wood color="#2a1a10" />
        </mesh>
      </ShadowGroup>
      <mesh geometry={shape} position={[0, 0.3, 0]}>
        <meshStandardMaterial color={COL.paper} emissive="#ffbf73" emissiveIntensity={1.3} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 0.6, 0]} color="#ffb766" intensity={2.6} distance={3} decay={2} />
      <Glow position={[0, 0.6, 0]} color="#ffc27a" size={1.2} opacity={0.35} map={glow} />
    </group>
  );
}

/* ---------- すだれ・風鈴・掛け軸・扇風機 ---------- */
export function CountryDecor() {
  const tex = useCountryTextures();
  const chime = useRef<THREE.Group>(null);
  const fan = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (chime.current) chime.current.rotation.z = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.1) * 0.05;
    if (fan.current) fan.current.rotation.z += dt * 9;
  });
  return (
    <group>
      {/* すだれ（窓の上半分） */}
      <mesh position={[1.3, 2.75, -2.86]}>
        <planeGeometry args={[2.1, 1.1]} />
        <meshStandardMaterial map={tex.sudare} transparent alphaTest={0.1} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[1.3, 3.3, -2.85]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 2.2, 10]} />
        <Wood color="#8a5a2e" />
      </mesh>
      {/* 風鈴 */}
      <group ref={chime} position={[0.6, 3.25, -2.7]}>
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.002, 0.002, 0.24, 4]} />
          <Matte color="#ddd" />
        </mesh>
        <mesh position={[0, -0.26, 0]}>
          <sphereGeometry args={[0.06, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
          <Glass color="#bfe3ff" opacity={0.45} />
        </mesh>
        <mesh position={[0, -0.42, 0]}>
          <planeGeometry args={[0.05, 0.16]} />
          <meshStandardMaterial color="#f2e6c8" side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* 掛け軸（左の壁） */}
      <group position={[-2.96, 2.0, -1.25]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[0.42, 1.1]} />
          <meshStandardMaterial color="#5a6a4a" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.005]}>
          <planeGeometry args={[0.32, 0.86]} />
          <meshStandardMaterial map={tex.scroll} roughness={0.9} />
        </mesh>
        {[-0.56, 0.56].map((y) => (
          <mesh key={y} position={[0, y, 0.01]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, 0.5, 10]} />
            <Wood color="#2a1a10" />
          </mesh>
        ))}
      </group>
      {/* 扇風機（ベッドの足もと） */}
      <group position={[2.7, 0, 2.5]} rotation={[0, -Math.PI / 2 - 0.7, 0]}>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.14, 0.16, 0.05, 28]} />
          <Matte color="#e8eef2" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.6, 10]} />
          <Matte color="#e8eef2" roughness={0.4} />
        </mesh>
        <group position={[0, 0.72, 0.05]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.008, 6, 40]} />
            <Matte color="#cfd8de" />
          </mesh>
          <group ref={fan}>
            {[0, 1, 2].map((i) => (
              <mesh key={i} rotation={[0, 0, (i / 3) * Math.PI * 2]} position={[0, 0, 0.01]}>
                <circleGeometry args={[0.15, 16, -0.3, 0.6]} />
                <meshPhysicalMaterial color="#a8d8ea" transparent opacity={0.7} side={THREE.DoubleSide} roughness={0.2} />
              </mesh>
            ))}
          </group>
          <mesh position={[0, 0, -0.06]}>
            <sphereGeometry args={[0.07, 20, 14]} />
            <Matte color="#e8eef2" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <circleGeometry args={[0.03, 16]} />
            <Emissive color="#a8d8ea" strength={1} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
