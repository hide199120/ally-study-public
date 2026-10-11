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
   「雨の夜」テーマの家具。くるみ材・ニット・真ちゅうのランプで、あたたかい読書部屋にする
   ===================================================== */

const COL = {
  walnut: "#6b4a32",
  walnutLight: "#8a6346",
  oat: "#d9cbb4",
  linen: "#ece6da",
  rust: "#b5652f",
  moss: "#2f4f46",
  mustard: "#d1a23b",
  brass: "#c9a24f",
};

/** テクスチャは一度だけ作って、同じテーマの家具で使い回す */
let cached: ReturnType<typeof buildRainTextures> | null = null;
function buildRainTextures() {
    // キルトの縫い目（ひし形）
    const quilt = makeTexture(256, 256, (g, w, h) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(120,100,80,0.35)";
      g.lineWidth = 3;
      for (let i = -w; i < w * 2; i += 48) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i + h, h);
        g.stroke();
        g.beginPath();
        g.moveTo(i, h);
        g.lineTo(i + h, 0);
        g.stroke();
      }
    });
    quilt.wrapS = quilt.wrapT = THREE.RepeatWrapping;
    quilt.repeat.set(3, 3);

    // ケーブル編みのニット
    const knit = makeTexture(128, 128, (g, w, h) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(0,0,0,0.18)";
      g.lineWidth = 6;
      for (let x = 16; x < w; x += 32) {
        for (let y = -16; y < h + 16; y += 20) {
          g.beginPath();
          g.ellipse(x, y, 9, 12, 0.4, 0, Math.PI * 2);
          g.stroke();
        }
      }
    });
    knit.wrapS = knit.wrapT = THREE.RepeatWrapping;
    knit.repeat.set(4, 4);

    // 編んだ丸いラグ
    const rug = makeTexture(256, 256, (g, w, h) => {
      for (let r = 128; r > 0; r -= 6) {
        const k = (r / 6) % 5;
        g.fillStyle = k === 0 ? "#b5652f" : k === 2 ? "#e6dcc8" : "#cdbb9c";
        g.beginPath();
        g.arc(w / 2, h / 2, r, 0, Math.PI * 2);
        g.fill();
      }
    });

    // 開いたノート
    const note = makeTexture(256, 160, (g, w, h) => {
      g.fillStyle = "#fbf6ea";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(90,120,170,0.35)";
      for (let y = 20; y < h; y += 12) {
        g.beginPath();
        g.moveTo(10, y);
        g.lineTo(w - 10, y);
        g.stroke();
      }
      g.fillStyle = "rgba(40,40,60,0.6)";
      for (let i = 0; i < 6; i++) g.fillRect(16, 16 + i * 12, 40 + ((i * 37) % 70), 3);
      g.fillStyle = "rgba(0,0,0,0.15)";
      g.fillRect(w / 2 - 1, 0, 2, h);
    });
    return { quilt, knit, rug, note };
}
function useRainTextures() {
  return useMemo(() => (cached ??= buildRainTextures()), []);
}

/** 湯気（ゆらゆらのぼるスプライト） */
function Steam({ position, glow }: { position: [number, number, number]; glow: THREE.Texture }) {
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  useFrame(({ clock }) => {
    refs.current.forEach((s, i) => {
      if (!s) return;
      const k = (clock.elapsedTime * 0.35 + i / 3) % 1;
      s.position.set(Math.sin(k * 6 + i) * 0.02, k * 0.25, 0);
      s.scale.setScalar(0.05 + k * 0.08);
      (s.material as THREE.SpriteMaterial).opacity = 0.35 * (1 - k);
    });
  });
  return (
    <group position={position}>
      {[0, 1, 2].map((i) => (
        <sprite key={i} ref={(el) => void (refs.current[i] = el)}>
          <spriteMaterial map={glow} color="#ffffff" transparent depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

/** 本の山 */
function BookStack({ position, colors, rotY = 0 }: { position: [number, number, number]; colors: string[]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {colors.map((c, i) => (
        <RoundedBox key={i} args={[0.24 - (i % 2) * 0.03, 0.045, 0.17]} radius={0.008} smoothness={2} position={[0, 0.023 + i * 0.046, 0]} rotation={[0, i * 0.15, 0]}>
          <Matte color={c} roughness={0.8} />
        </RoundedBox>
      ))}
    </group>
  );
}

/* ---------- 書きもの机と真ちゅうのランプ ---------- */
export function RainDesk({ glow }: { glow: THREE.Texture }) {
  const tex = useRainTextures();
  const top = useMemo(() => roundedSlab(0.82, 2.05, 0.05, 0.03), []);
  return (
    <group>
      <ShadowGroup>
        <mesh geometry={top} position={[-2.53, 0.78, -1.2]}>
          <Wood color={COL.walnut} />
        </mesh>
        {/* 天板の下の引き出し */}
        <RoundedBox args={[0.7, 0.12, 1.9]} radius={0.02} smoothness={3} position={[-2.53, 0.69, -1.2]}>
          <Wood color={COL.walnutLight} />
        </RoundedBox>
        {[-1.7, -0.7].map((z) => (
          <mesh key={z} position={[-2.17, 0.69, z]}>
            <sphereGeometry args={[0.015, 12, 10]} />
            <Metal color={COL.brass} />
          </mesh>
        ))}
        {/* 先が細い脚 */}
        {[
          [-2.88, -2.15],
          [-2.18, -2.15],
          [-2.88, -0.25],
          [-2.18, -0.25],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.33, z]}>
            <cylinderGeometry args={[0.03, 0.018, 0.66, 14]} />
            <Wood color={COL.walnut} />
          </mesh>
        ))}
        {/* 真ちゅうのランプ（緑のガラスのかさ） */}
        <group position={[-2.72, 0.8, -1.95]}>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.08, 0.09, 0.03, 28]} />
            <Metal color={COL.brass} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.36, 10]} />
            <Metal color={COL.brass} roughness={0.25} />
          </mesh>
          <mesh position={[0.06, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 0.32, 32, 1, true, 0, Math.PI]} />
            <meshPhysicalMaterial color="#1f6a4a" roughness={0.15} clearcoat={1} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.06, 0.37, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.26, 16]} />
            <Emissive color="#ffd08a" strength={2.2} />
          </mesh>
        </group>
        {/* ノート・ペン・本・紅茶 */}
        <mesh position={[-2.42, 0.808, -1.15]} rotation={[-Math.PI / 2, 0, -Math.PI / 2 + 0.1]}>
          <planeGeometry args={[0.42, 0.27]} />
          <Matte color="#ffffff" roughness={0.9} map={tex.note} />
        </mesh>
        <mesh position={[-2.36, 0.812, -0.88]} rotation={[0, 0.4, Math.PI / 2]}>
          <cylinderGeometry args={[0.005, 0.005, 0.15, 8]} />
          <Matte color="#1c1c22" roughness={0.3} />
        </mesh>
        <BookStack position={[-2.62, 0.805, -0.5]} colors={["#7a3b2e", "#2f4f46", "#c9a24f", "#3b4a6b"]} rotY={0.3} />
        <group position={[-2.35, 0.805, -1.65]}>
          <mesh position={[0, 0.006, 0]}>
            <cylinderGeometry args={[0.07, 0.06, 0.012, 28]} />
            <Matte color="#f4efe4" roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.045, 0.032, 0.07, 28]} />
            <Matte color="#f4efe4" roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.072, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.04, 24]} />
            <Matte color="#9a5a2a" roughness={0.1} />
          </mesh>
        </group>
      </ShadowGroup>
      <Steam position={[-2.35, 0.9, -1.65]} glow={glow} />
      <pointLight position={[-2.6, 1.1, -1.9]} color="#ffb766" intensity={4} distance={3} decay={2} />
      <Glow position={[-2.66, 1.16, -1.95]} color="#ffc27a" size={1.2} opacity={0.35} map={glow} />
    </group>
  );
}

/* ---------- 木のイス（ブランケットをかけて） ---------- */
export function RainChair({ children }: { children?: ReactNode }) {
  const tex = useRainTextures();
  const geo = useMemo(
    () => ({
      seat: softBox(0.5, 0.06, 0.46, { radius: 0.025, density: 14 }),
      cushion: softBox(0.44, 0.06, 0.42, { radius: 0.03, puff: 0.025, wrinkle: 0.003 }),
      throwB: softBox(0.5, 0.04, 0.7, { radius: 0.018, wrinkle: 0.012, seed: 21 }),
    }),
    [],
  );
  return (
    <group position={[-1.7, 0, -1.2]} rotation={[0, -Math.PI / 2 + 0.25, 0]}>
      <ShadowGroup>
        <mesh geometry={geo.seat} position={[0, 0.46, 0]}>
          <Wood color={COL.walnutLight} />
        </mesh>
        <mesh geometry={geo.cushion} position={[0, 0.51, 0.01]}>
          <Fabric color={COL.mustard} />
        </mesh>
        {[
          [-0.2, -0.18],
          [0.2, -0.18],
          [-0.2, 0.18],
          [0.2, 0.18],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.22, z]} rotation={[z > 0 ? 0.06 : -0.06, 0, x > 0 ? -0.06 : 0.06]}>
            <cylinderGeometry args={[0.02, 0.015, 0.45, 12]} />
            <Wood color={COL.walnut} />
          </mesh>
        ))}
        {/* 背もたれの細い棒 */}
        {[-0.18, -0.06, 0.06, 0.18].map((x) => (
          <mesh key={x} position={[x, 0.75, -0.2]} rotation={[-0.1, 0, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.55, 10]} />
            <Wood color={COL.walnut} />
          </mesh>
        ))}
        <mesh position={[0, 1.02, -0.23]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.025, 0.42, 6, 12]} />
          <Wood color={COL.walnut} />
        </mesh>
        {/* 背にかけたニットのブランケット */}
        <mesh geometry={geo.throwB} position={[0.02, 0.9, -0.22]} rotation={[Math.PI / 2 - 0.1, 0, 0.05]}>
          <meshPhysicalMaterial color={COL.linen} map={tex.knit} roughness={1} sheen={0.8} sheenColor="#ffffff" />
        </mesh>
      </ShadowGroup>
      {children}
    </group>
  );
}

/* ---------- キルトの布団のベッド ---------- */
export function RainBed({ children }: { children?: ReactNode }) {
  const tex = useRainTextures();
  const geo = useMemo(
    () => ({
      frame: softBox(2.74, 0.24, 2.02, { radius: 0.04, density: 14 }),
      head: softBox(0.12, 1.05, 2.02, { radius: 0.05, density: 14 }),
      mattress: softBox(2.56, 0.26, 1.9, { radius: 0.08, puff: 0.01, density: 18 }),
      duvet: softBox(1.9, 0.14, 2.06, { radius: 0.07, wrinkle: 0.012, puff: 0.05, seed: 31 }),
      throwB: softBox(0.55, 0.06, 2.1, { radius: 0.025, wrinkle: 0.012, seed: 33 }),
      pillow: softBox(0.42, 0.17, 0.66, { radius: 0.08, puff: 0.05, wrinkle: 0.006, seed: 35 }),
      cushion: softBox(0.34, 0.34, 0.12, { radius: 0.06, puff: 0.03, seed: 37 }),
    }),
    [],
  );
  return (
    <group>
      <ShadowGroup>
        <mesh geometry={geo.frame} position={[1.55, 0.3, -2.0]}>
          <Wood color={COL.walnut} />
        </mesh>
        {[0.32, 2.78].map((x) => (
          <group key={x}>
            {[-2.95, -1.05].map((z) => (
              <mesh key={z} position={[x, 0.09, z]}>
                <cylinderGeometry args={[0.05, 0.04, 0.18, 14]} />
                <Wood color={COL.walnut} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh geometry={geo.head} position={[0.24, 0.72, -2.0]}>
          <Wood color={COL.walnutLight} />
        </mesh>
        <mesh geometry={geo.mattress} position={[1.6, 0.55, -2.0]}>
          <Fabric color={COL.linen} sheen={0.2} />
        </mesh>
        <mesh geometry={geo.duvet} position={[1.98, 0.72, -2.0]}>
          <meshPhysicalMaterial color={COL.oat} map={tex.quilt} roughness={0.95} sheen={0.7} sheenColor="#ffffff" />
        </mesh>
        <mesh geometry={geo.throwB} position={[2.55, 0.8, -2.0]}>
          <meshPhysicalMaterial color={COL.rust} map={tex.knit} roughness={1} sheen={0.8} sheenColor="#ffd9b0" />
        </mesh>
        <mesh geometry={geo.pillow} position={[0.62, 0.78, -2.45]} rotation={[0, 0.06, 0.05]}>
          <Fabric color="#f6f2ea" sheen={0.3} />
        </mesh>
        <mesh geometry={geo.pillow} position={[0.62, 0.78, -1.62]} rotation={[0, -0.08, -0.04]}>
          <Fabric color="#ddd5c6" sheen={0.3} />
        </mesh>
        <mesh geometry={geo.cushion} position={[0.85, 0.9, -2.0]} rotation={[0.1, 0.4, -0.25]}>
          <Fabric color={COL.moss} />
        </mesh>
      </ShadowGroup>
      {children}
    </group>
  );
}

/* ---------- ナイトテーブルとランタン ---------- */
export function RainNightstand({ glow }: { glow: THREE.Texture }) {
  const body = useMemo(() => softBox(0.6, 0.58, 0.5, { radius: 0.025, density: 12 }), []);
  const flame = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const k = 1 + Math.sin(t * 7) * 0.06 + Math.sin(t * 13.3) * 0.04;
    if (flame.current) flame.current.scale.set(1, k, 1);
    if (light.current) light.current.intensity = 3.6 * k;
  });
  return (
    <group position={[2.55, 0, -0.5]}>
      <ShadowGroup>
        <mesh geometry={body} position={[0, 0.31, 0]}>
          <Wood color={COL.walnut} />
        </mesh>
        <mesh position={[0, 0.36, 0.255]}>
          <sphereGeometry args={[0.018, 12, 10]} />
          <Metal color={COL.brass} />
        </mesh>
        {/* ランタン（黒い枠＋ガラス） */}
        <group position={[-0.1, 0.6, -0.05]}>
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[0.08, 0.085, 0.025, 6]} />
            <Matte color="#1f1f22" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <coneGeometry args={[0.085, 0.07, 6]} />
            <Matte color="#1f1f22" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <torusGeometry args={[0.025, 0.006, 8, 16]} />
            <Matte color="#1f1f22" roughness={0.4} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.075, 0.12, Math.sin(a) * 0.075]}>
                <boxGeometry args={[0.008, 0.2, 0.008]} />
                <Matte color="#1f1f22" roughness={0.4} />
              </mesh>
            );
          })}
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.072, 0.072, 0.2, 6, 1, true]} />
            <Glass color="#fff4dc" opacity={0.18} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.07, 16]} />
            <Matte color="#f7efe0" roughness={0.6} />
          </mesh>
        </group>
        <BookStack position={[0.14, 0.6, 0.06]} colors={["#3b4a6b", "#7a3b2e"]} rotY={-0.4} />
      </ShadowGroup>
      <mesh ref={flame} position={[-0.1, 0.72, -0.05]} scale={[1, 1, 1]}>
        <sphereGeometry args={[0.014, 12, 10]} />
        <Emissive color="#ffbe5c" strength={3} />
      </mesh>
      <pointLight ref={light} position={[-0.1, 0.75, -0.05]} color="#ffa94d" intensity={3.6} distance={3.5} decay={2} />
      <Glow position={[-0.1, 0.73, -0.05]} color="#ffb05c" size={0.9} opacity={0.5} map={glow} />
    </group>
  );
}

/* ---------- 編んだ丸いラグ ---------- */
export function RainRug() {
  const tex = useRainTextures();
  return (
    <mesh position={[-0.1, 0.012, 1.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[1.25, 64]} />
      <meshPhysicalMaterial map={tex.rug} roughness={1} sheen={0.5} sheenColor="#fff" />
    </mesh>
  );
}

/* ---------- ベルベットのソファ ---------- */
export function RainSofa() {
  const tex = useRainTextures();
  const geo = useMemo(
    () => ({
      body: softBox(1.5, 0.3, 0.84, { radius: 0.12, puff: 0.01, density: 16 }),
      seat: softBox(1.26, 0.16, 0.66, { radius: 0.07, puff: 0.035, wrinkle: 0.004 }),
      back: softBox(1.5, 0.5, 0.2, { radius: 0.1, puff: 0.02, wrinkle: 0.004, seed: 41 }),
      arm: softBox(0.18, 0.42, 0.84, { radius: 0.09 }),
      cushion: softBox(0.36, 0.34, 0.12, { radius: 0.06, puff: 0.03, wrinkle: 0.004, seed: 43 }),
      throwB: softBox(0.55, 0.05, 0.9, { radius: 0.022, wrinkle: 0.014, seed: 45 }),
    }),
    [],
  );
  const velvet = <meshPhysicalMaterial color={COL.moss} roughness={0.75} sheen={1} sheenRoughness={0.4} sheenColor="#9fd3bf" />;
  return (
    <group position={[2.3, 0, 0.7]} rotation={[0, -Math.PI / 2, 0]}>
      <ShadowGroup>
        <mesh geometry={geo.body} position={[0, 0.27, 0]}>
          {velvet}
        </mesh>
        <mesh geometry={geo.seat} position={[0, 0.48, 0.07]}>
          {velvet}
        </mesh>
        <mesh geometry={geo.back} position={[0, 0.66, -0.3]} rotation={[-0.12, 0, 0]}>
          {velvet}
        </mesh>
        {[-0.72, 0.72].map((x) => (
          <mesh key={x} geometry={geo.arm} position={[x, 0.45, 0]}>
            {velvet}
          </mesh>
        ))}
        {[-0.6, 0.6].map((x) =>
          [-0.3, 0.3].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.06, z]}>
              <cylinderGeometry args={[0.025, 0.018, 0.12, 12]} />
              <Metal color={COL.brass} />
            </mesh>
          )),
        )}
        <mesh geometry={geo.cushion} position={[-0.45, 0.72, -0.12]} rotation={[-0.25, 0.25, 0.12]}>
          <Fabric color={COL.mustard} />
        </mesh>
        <mesh geometry={geo.throwB} position={[0.55, 0.62, 0.04]} rotation={[0, 0.1, -0.15]}>
          <meshPhysicalMaterial color={COL.linen} map={tex.knit} roughness={1} sheen={0.8} sheenColor="#fff" />
        </mesh>
      </ShadowGroup>
    </group>
  );
}

/* ---------- 本でいっぱいの本棚 ---------- */
const SPINES = ["#7a3b2e", "#2f4f46", "#c9a24f", "#3b4a6b", "#8a6346", "#5a2a3a", "#d9cbb4", "#4a6b5a", "#a0522d", "#2b2b33"];
export function RainShelf() {
  const books = useMemo(() => {
    const out: { x: number; y: number; h: number; w: number; c: string }[] = [];
    [0.06, 0.48, 0.9, 1.32].forEach((y, row) => {
      let x = -0.44;
      let i = row * 11;
      const end = row === 2 ? 0.1 : 0.42;
      while (x < end) {
        const w = 0.03 + ((i * 13) % 5) * 0.008;
        out.push({ x: x + w / 2, y, w, h: 0.26 + ((i * 31) % 7) * 0.016, c: SPINES[(i * 7) % SPINES.length] });
        x += w + 0.003;
        i++;
      }
    });
    return out;
  }, []);
  return (
    <group position={[-2.72, 0, 0.6]} rotation={[0, Math.PI / 2, 0]}>
      <ShadowGroup>
        <RoundedBox args={[1.04, 1.8, 0.04]} radius={0.01} smoothness={2} position={[0, 0.9, -0.17]}>
          <Wood color={COL.walnutLight} />
        </RoundedBox>
        {[-0.5, 0.5].map((x) => (
          <RoundedBox key={x} args={[0.04, 1.8, 0.38]} radius={0.012} smoothness={3} position={[x, 0.9, 0]}>
            <Wood color={COL.walnut} />
          </RoundedBox>
        ))}
        {[0.03, 0.45, 0.87, 1.29, 1.71, 1.8].map((y) => (
          <RoundedBox key={y} args={[1.04, 0.035, 0.38]} radius={0.01} smoothness={3} position={[0, y, 0]}>
            <Wood color={COL.walnut} />
          </RoundedBox>
        ))}
        {books.map((b, i) => (
          <RoundedBox key={i} args={[b.w, b.h, 0.25]} radius={0.005} smoothness={2} position={[b.x, b.y + b.h / 2 + 0.01, 0.03]}>
            <Matte color={b.c} roughness={0.8} />
          </RoundedBox>
        ))}
        {/* 小さな植物と砂時計 */}
        <mesh position={[0.3, 0.98, 0.04]}>
          <cylinderGeometry args={[0.06, 0.05, 0.1, 20]} />
          <Matte color="#e8dccb" roughness={0.5} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[0.3 + Math.sin(i * 1.3) * 0.05, 1.08 + (i % 2) * 0.04, 0.04 + Math.cos(i * 1.3) * 0.05]}>
            <sphereGeometry args={[0.05, 12, 8]} />
            <meshStandardMaterial color="#4f7a4c" roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0.2, 1.88, 0.02]}>
          <cylinderGeometry args={[0.07, 0.07, 0.2, 20]} />
          <Matte color="#cdbb9c" />
        </mesh>
      </ShadowGroup>
    </group>
  );
}

/* ---------- 丸いサイドテーブルとティーポット ---------- */
export function RainTeaTable() {
  const pot = useMemo(() => {
    const pts = [
      [0, 0],
      [0.07, 0.005],
      [0.1, 0.04],
      [0.105, 0.08],
      [0.085, 0.12],
      [0.04, 0.14],
      [0.035, 0.15],
      [0.0, 0.16],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 40);
  }, []);
  return (
    <group position={[-0.65, 0, 1.75]}>
      <ShadowGroup>
        <mesh position={[0, 0.44, 0]}>
          <cylinderGeometry args={[0.36, 0.36, 0.04, 48]} />
          <Wood color={COL.walnutLight} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.03, 0.04, 0.42, 16]} />
          <Wood color={COL.walnut} />
        </mesh>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.14, 0.04, Math.sin(a) * 0.14]} rotation={[0, -a, Math.PI / 2 - 0.35]}>
              <capsuleGeometry args={[0.015, 0.26, 4, 10]} />
              <Wood color={COL.walnut} />
            </mesh>
          );
        })}
        <mesh geometry={pot} position={[0.06, 0.46, 0]}>
          <Matte color="#e9e4da" roughness={0.2} />
        </mesh>
        <mesh position={[0.2, 0.54, 0]} rotation={[0, 0, -0.9]}>
          <cylinderGeometry args={[0.008, 0.018, 0.12, 12]} />
          <Matte color="#e9e4da" roughness={0.2} />
        </mesh>
        <mesh position={[-0.05, 0.54, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.04, 0.01, 8, 16, Math.PI]} />
          <Matte color="#e9e4da" roughness={0.2} />
        </mesh>
        {[
          [-0.18, 0.12],
          [-0.12, -0.18],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.49, z]}>
            <cylinderGeometry args={[0.035, 0.028, 0.06, 20]} />
            <Matte color="#e9e4da" roughness={0.2} />
          </mesh>
        ))}
      </ShadowGroup>
    </group>
  );
}

/* ---------- 三脚のフロアランプ ---------- */
export function TripodLamp({ glow }: { glow: THREE.Texture }) {
  return (
    <group position={[-0.55, 0, -2.6]}>
      <ShadowGroup>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 + 0.4;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.14, 0.62, Math.sin(a) * 0.14]} rotation={[Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22]}>
              <cylinderGeometry args={[0.014, 0.018, 1.28, 10]} />
              <Wood color={COL.walnut} />
            </mesh>
          );
        })}
        <mesh position={[0, 1.42, 0]}>
          <cylinderGeometry args={[0.22, 0.26, 0.3, 40, 1, true]} />
          <meshStandardMaterial color="#efe3cc" roughness={1} side={THREE.DoubleSide} emissive="#ffcf8a" emissiveIntensity={0.6} />
        </mesh>
      </ShadowGroup>
      <pointLight position={[0, 1.38, 0]} color="#ffbf73" intensity={3} distance={3.5} decay={2} />
      <Glow position={[0, 1.4, 0]} color="#ffc27a" size={1.2} opacity={0.35} map={glow} />
    </group>
  );
}

/* ---------- 窓につく雨つぶ ---------- */
export function RainDecor() {
  // 窓（アーチ）の内側にだけ置く
  const drops = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        x: 1.3 + (((i * 53) % 100) / 100 - 0.5) * 1.9,
        y: 1.0 + (((i * 37) % 100) / 100) * 2.3,
        s: 0.008 + ((i * 17) % 10) / 1000,
      })).filter((d) => d.y < 2.35 || Math.hypot(d.x - 1.3, d.y - 2.35) < 0.95),
    [],
  );
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    // いくつかのつぶがゆっくり流れ落ちる
    group.current?.children.forEach((m, i) => {
      if (i % 7 !== 0) return;
      m.position.y -= dt * 0.08;
      if (m.position.y < 1.0) m.position.y = 3.1;
    });
  });
  return (
    <group ref={group}>
      {drops.map((d, i) => (
        <mesh key={i} position={[d.x, d.y, -2.99]} scale={[1, 1.4, 0.5]}>
          <sphereGeometry args={[d.s, 8, 6]} />
          <meshPhysicalMaterial color="#dfe9f5" transparent opacity={0.55} roughness={0.05} clearcoat={1} />
        </mesh>
      ))}
    </group>
  );
}
