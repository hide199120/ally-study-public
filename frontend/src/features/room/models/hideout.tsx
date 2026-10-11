import { useMemo, useRef } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Glow, ShadowGroup } from "./shared";
import { beveledShape, roundedSlab, softBox } from "./geometry";
import { makeTexture, type V3 } from "./utils";

/* =====================================================
   「秘密基地」テーマの家具。
   ほかのテーマの家具と同じ場所・同じ大きさに置くので、模様替えの配置はそのまま使える
   ===================================================== */

const COL = {
  oak: "#d8b28a",
  oakDark: "#a9805a",
  white: "#eef0f2",
  black: "#1c1e23",
  charcoal: "#2c3038",
  slate: "#454c5a",
  fabric: "#3b404b",
  teal: "#38d6c4",
  pink: "#ff4f9a",
};

/** 布（少しだけ光沢のある起毛） */
function Fabric({ color, sheen = 0.6 }: { color: string; sheen?: number }) {
  return <meshPhysicalMaterial color={color} roughness={0.92} sheen={sheen} sheenRoughness={0.8} sheenColor="#ffffff" />;
}
/** 木（つや消しの塗装） */
function Wood({ color = COL.oak }: { color?: string }) {
  return <meshPhysicalMaterial color={color} roughness={0.55} clearcoat={0.25} clearcoatRoughness={0.6} />;
}
/** つや消しの樹脂・塗装 */
function Matte({ color, roughness = 0.6 }: { color: string; roughness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} />;
}
/** 光る素材（ブルームで光がにじむ） */
function Emissive({ color, strength = 2 }: { color: string; strength?: number }) {
  return <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(strength)} toneMapped={false} />;
}

function useHideoutTextures() {
  return useMemo(() => {
    // モニターの画面（夕焼けのゲーム画面とウィンドウ）
    const screen = makeTexture(1024, 400, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#ffb15c");
      sky.addColorStop(0.55, "#ff7a3d");
      sky.addColorStop(1, "#7a2f3a");
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffe2a0";
      g.beginPath();
      g.arc(w * 0.62, h * 0.48, 48, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#5a2234";
      g.beginPath();
      g.moveTo(0, h * 0.78);
      for (let x = 0; x <= w; x += 64) g.lineTo(x, h * (0.66 + 0.08 * Math.sin(x * 0.013) + 0.04 * Math.sin(x * 0.041)));
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.fill();
      g.fillStyle = "#2d1220";
      g.fillRect(0, h * 0.86, w, h * 0.14);
      // エディタのウィンドウ
      g.fillStyle = "rgba(20,24,34,0.92)";
      g.fillRect(40, 40, 330, 250);
      const colors = ["#7ff5e6", "#ff9be0", "#ffd27a", "#9db4ff"];
      for (let i = 0; i < 12; i++) {
        g.fillStyle = colors[i % 4];
        g.fillRect(60 + (i % 3) * 14, 64 + i * 18, 80 + ((i * 53) % 170), 7);
      }
      g.fillStyle = "rgba(20,24,34,0.85)";
      g.fillRect(w - 230, 40, 190, 70);
      g.fillStyle = "#7ff5e6";
      g.font = "700 40px system-ui, sans-serif";
      g.fillText("25:00", w - 200, 92);
    });
    screen.wrapS = THREE.RepeatWrapping;
    screen.repeat.x = -1; // 内側から見るので左右を反転

    // キーボードの上面
    const keys = makeTexture(256, 96, (g, w, h) => {
      g.fillStyle = "#15171c";
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 15; x++) {
          g.fillStyle = "#2a2e36";
          g.fillRect(4 + x * 16.6, 5 + y * 17.8, 14, 15);
          g.fillStyle = `hsla(${180 + x * 8 + y * 10}, 90%, 65%, 0.45)`;
          g.fillRect(6 + x * 16.6, 17 + y * 17.8, 10, 2);
        }
      }
    });

    // ネオンサイン
    const neon = makeTexture(512, 192, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.font = "italic 800 120px system-ui, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.shadowColor = "#38d6c4";
      g.shadowBlur = 28;
      g.strokeStyle = "#9ffcf0";
      g.lineWidth = 8;
      g.strokeText("focus", w / 2, h / 2);
      g.shadowBlur = 8;
      g.fillStyle = "#e9fffb";
      g.fillText("focus", w / 2, h / 2);
    });

    // ポスター
    const poster = makeTexture(256, 360, (g, w, h) => {
      const bg = g.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, "#2a1d4a");
      bg.addColorStop(1, "#0c3b44");
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#ff7ab8";
      g.beginPath();
      g.arc(w * 0.5, h * 0.4, 70, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#38d6c4";
      g.lineWidth = 6;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.moveTo(20, h * 0.62 + i * 14);
        g.lineTo(w - 20, h * 0.62 + i * 14);
        g.stroke();
      }
      g.fillStyle = "#f2f2f2";
      g.font = "800 28px system-ui, sans-serif";
      g.fillText("NIGHT", 24, h - 30);
    });

    // ラグ（ふちに線の入った濃いグレー）
    const rug = makeTexture(256, 180, (g, w, h) => {
      g.fillStyle = "#2b2f3a";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "#38d6c4";
      g.lineWidth = 3;
      g.strokeRect(14, 14, w - 28, h - 28);
      g.strokeStyle = "rgba(255,255,255,0.18)";
      g.lineWidth = 1.5;
      g.strokeRect(22, 22, w - 44, h - 44);
      // 毛足のざらつき（決まった並びの点）
      for (let i = 0; i < 2000; i++) {
        g.fillStyle = `rgba(255,255,255,${((i * 37) % 50) / 1000})`;
        g.fillRect((i * 97) % w, (i * 61 + Math.floor(i / 7)) % h, 1, 1);
      }
    });

    return { screen, keys, neon, poster, rug };
  }, []);
}

/* ---------- デスク（左の壁ぞい） ---------- */
export function HideoutDesk({ glow }: { glow: THREE.Texture }) {
  const tex = useHideoutTextures();
  const geo = useMemo(
    () => ({
      top: roundedSlab(0.85, 2.15, 0.05, 0.05),
      drawer: softBox(0.8, 0.72, 0.46, { radius: 0.025, density: 12 }),
      tower: softBox(0.42, 0.5, 0.22, { radius: 0.02, density: 12 }),
      pad: roundedSlab(0.42, 0.95, 0.006, 0.04, 0.002),
      mouse: new THREE.SphereGeometry(0.035, 24, 16),
    }),
    [],
  );
  // 曲面モニター（中心が手前にある円柱の一部）
  const R = 1.6;
  const ARC = 0.62;
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) (ring.current.material as THREE.MeshBasicMaterial).color.setHSL(0.5 + Math.sin(clock.elapsedTime * 0.5) * 0.08, 0.9, 0.6);
  });
  return (
    <group>
      <ShadowGroup>
        {/* 天板と脚 */}
        <mesh geometry={geo.top} position={[-2.52, 0.78, -1.2]}>
          <Wood />
        </mesh>
        <mesh geometry={geo.drawer} position={[-2.52, 0.38, -0.45]}>
          <Matte color={COL.white} roughness={0.45} />
        </mesh>
        {[0.19, 0.42, 0.62].map((y) => (
          <mesh key={y} position={[-2.115, y, -0.45]}>
            <boxGeometry args={[0.01, 0.006, 0.3]} />
            <Matte color="#c9ccd2" />
          </mesh>
        ))}
        {[-2.85, -2.2].map((x) => (
          <RoundedBox key={x} args={[0.06, 0.76, 0.06]} radius={0.02} smoothness={3} position={[x, 0.38, -2.15]}>
            <Matte color={COL.black} roughness={0.35} />
          </RoundedBox>
        ))}
        {/* PC本体（ガラス越しにファンが光る） */}
        <mesh geometry={geo.tower} position={[-2.55, 0.26, -1.85]} rotation={[0, Math.PI / 2, 0]}>
          <Matte color={COL.black} roughness={0.3} />
        </mesh>
        {/* モニター：画面と外側のカバー */}
        <group position={[-2.68 + R, 1.17, -1.25]}>
          <mesh>
            <cylinderGeometry args={[R, R, 0.42, 48, 1, true, -Math.PI / 2 - ARC / 2, ARC]} />
            <meshBasicMaterial map={tex.screen} side={THREE.BackSide} toneMapped={false} color="#f0f0f0" />
          </mesh>
          <mesh>
            <cylinderGeometry args={[R + 0.025, R + 0.025, 0.46, 48, 1, true, -Math.PI / 2 - ARC / 2 - 0.012, ARC + 0.024]} />
            <Matte color={COL.black} roughness={0.4} />
          </mesh>
        </group>
        <mesh position={[-2.86, 0.98, -1.25]}>
          <cylinderGeometry args={[0.02, 0.02, 0.36, 12]} />
          <Matte color="#2a2d33" roughness={0.3} />
        </mesh>
        <RoundedBox args={[0.24, 0.02, 0.3]} radius={0.008} smoothness={3} position={[-2.78, 0.815, -1.25]}>
          <Matte color="#2a2d33" roughness={0.3} />
        </RoundedBox>
        {/* マウスパッド・キーボード・マウス */}
        <mesh geometry={geo.pad} position={[-2.36, 0.808, -1.22]}>
          <Matte color="#16181d" roughness={0.9} />
        </mesh>
        <RoundedBox args={[0.15, 0.022, 0.44]} radius={0.008} smoothness={3} position={[-2.36, 0.824, -1.3]}>
          <Matte color="#202329" roughness={0.4} />
        </RoundedBox>
        <mesh position={[-2.36, 0.836, -1.3]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
          <planeGeometry args={[0.43, 0.14]} />
          <meshStandardMaterial map={tex.keys} emissiveMap={tex.keys} emissive="#ffffff" emissiveIntensity={0.6} roughness={0.5} />
        </mesh>
        <mesh geometry={geo.mouse} position={[-2.34, 0.82, -0.9]} scale={[1.6, 0.7, 1]}>
          <Matte color="#202329" roughness={0.35} />
        </mesh>
        {/* マグカップ */}
        <mesh position={[-2.35, 0.86, -0.62]}>
          <cylinderGeometry args={[0.04, 0.036, 0.1, 24]} />
          <Matte color="#f4f1ea" roughness={0.3} />
        </mesh>
        <mesh position={[-2.31, 0.86, -0.62]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.022, 0.006, 8, 16]} />
          <Matte color="#f4f1ea" roughness={0.3} />
        </mesh>
        {/* ヘッドホン */}
        <group position={[-2.5, 0.83, -1.95]} rotation={[0, 0.3, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1, 0.012, 10, 32, Math.PI]} />
            <Matte color={COL.charcoal} roughness={0.4} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.1, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.035, 24]} />
              <Fabric color="#30343d" sheen={0.3} />
            </mesh>
          ))}
        </group>
        {/* リングライト */}
        <mesh position={[-2.82, 1.02, -2.0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.42, 8]} />
          <Matte color="#2a2d33" />
        </mesh>
        <mesh position={[-2.82, 1.33, -2.0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.12, 0.016, 12, 40]} />
          <Emissive color="#fff6e8" strength={2.4} />
        </mesh>
      </ShadowGroup>
      {/* PCのガラス面とファン */}
      <mesh position={[-2.33, 0.26, -1.85]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.18, 0.44]} />
        <meshBasicMaterial color="#0e1420" transparent opacity={0.85} />
      </mesh>
      {[0.38, 0.16].map((y, i) => (
        <mesh key={y} ref={i === 0 ? ring : undefined} position={[-2.325, y, -1.85]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.055, 0.008, 8, 32]} />
          <meshBasicMaterial color={new THREE.Color(COL.pink).multiplyScalar(2)} toneMapped={false} />
        </mesh>
      ))}
      {/* デスク裏のLEDテープ */}
      <mesh position={[-2.93, 0.755, -1.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.1, 0.02]} />
        <Emissive color="#3a7bff" strength={3} />
      </mesh>
      <pointLight position={[-2.2, 1.2, -1.25]} color="#ff9a5a" intensity={2.4} distance={2.2} decay={2} />
      <pointLight position={[-2.6, 1.35, -2.0]} color="#fff3e0" intensity={1.6} distance={2} decay={2} />
      <Glow position={[-2.6, 1.17, -1.25]} color="#ff9a5a" size={1.6} opacity={0.25} map={glow} />
    </group>
  );
}

/* ---------- ゲーミングチェア ---------- */
export function GamingChair({ children }: { children?: ReactNode }) {
  const geo = useMemo(
    () => ({
      seat: softBox(0.52, 0.12, 0.5, { radius: 0.05, puff: 0.02, wrinkle: 0.002 }),
      back: softBox(0.48, 0.78, 0.1, { radius: 0.045, puff: 0.012, wrinkle: 0.002, seed: 2 }),
      wing: softBox(0.09, 0.62, 0.13, { radius: 0.04 }),
      head: softBox(0.26, 0.12, 0.08, { radius: 0.035, puff: 0.02, seed: 4 }),
      lumbar: softBox(0.3, 0.12, 0.07, { radius: 0.03, puff: 0.02, seed: 5 }),
      pad: softBox(0.08, 0.04, 0.26, { radius: 0.018 }),
    }),
    [],
  );
  return (
    <group position={[-1.75, 0, -1.2]} rotation={[0, -Math.PI / 2 + 0.12, 0]}>
      <ShadowGroup>
        {/* 足（5本の脚とキャスター） */}
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2 + 0.3;
          return (
            <group key={i} rotation={[0, a, 0]}>
              <mesh position={[0.16, 0.08, 0]} rotation={[0, 0, Math.PI / 2 - 0.12]}>
                <capsuleGeometry args={[0.022, 0.28, 6, 12]} />
                <Matte color={COL.black} roughness={0.25} />
              </mesh>
              <mesh position={[0.31, 0.035, 0]}>
                <sphereGeometry args={[0.035, 16, 12]} />
                <Matte color="#111" roughness={0.3} />
              </mesh>
            </group>
          );
        })}
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.028, 0.035, 0.34, 16]} />
          <meshStandardMaterial color="#9aa0aa" metalness={0.9} roughness={0.25} />
        </mesh>
        {/* 座面 */}
        <mesh geometry={geo.seat} position={[0, 0.48, 0.02]}>
          <Fabric color={COL.black} sheen={0.4} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.25, 0.53, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.04, 0.38, 8, 16]} />
            <Fabric color={COL.black} sheen={0.4} />
          </mesh>
        ))}
        {/* 背もたれ（両わきの張り出しにテーマ色のライン） */}
        <group position={[0, 0.98, -0.25]} rotation={[-0.14, 0, 0]}>
          <mesh geometry={geo.back}>
            <Fabric color={COL.black} sheen={0.4} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.24, -0.05, 0.03]} rotation={[0, -s * 0.35, 0]}>
              <mesh geometry={geo.wing}>
                <Fabric color={COL.black} sheen={0.4} />
              </mesh>
              <mesh position={[0, 0, 0.066]}>
                <boxGeometry args={[0.025, 0.56, 0.004]} />
                <Matte color={COL.teal} roughness={0.5} />
              </mesh>
            </group>
          ))}
          <mesh geometry={geo.head} position={[0, 0.28, 0.07]}>
            <Fabric color="#2a2e36" />
          </mesh>
          <mesh geometry={geo.lumbar} position={[0, -0.22, 0.07]}>
            <Fabric color="#2a2e36" />
          </mesh>
        </group>
        {/* ひじ掛け */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.31, 0, 0.02]}>
            <mesh position={[0, 0.56, -0.02]}>
              <boxGeometry args={[0.03, 0.14, 0.04]} />
              <Matte color={COL.black} roughness={0.3} />
            </mesh>
            <mesh geometry={geo.pad} position={[0, 0.65, 0]}>
              <Matte color="#25282e" roughness={0.6} />
            </mesh>
          </group>
        ))}
      </ShadowGroup>
      {children}
    </group>
  );
}

/* ---------- ベッド（窓の下） ---------- */
export function HideoutBed({ children }: { children?: ReactNode }) {
  const geo = useMemo(
    () => ({
      frame: softBox(2.72, 0.26, 2.02, { radius: 0.06, density: 16 }),
      panel: softBox(0.14, 0.88, 0.49, { radius: 0.05, puff: 0, wrinkle: 0.002 }),
      mattress: softBox(2.55, 0.24, 1.9, { radius: 0.08, puff: 0.012, density: 18 }),
      duvet: softBox(1.85, 0.12, 2.04, { radius: 0.06, wrinkle: 0.014, puff: 0.04, seed: 3 }),
      fold: softBox(0.3, 0.1, 2.06, { radius: 0.045, wrinkle: 0.008, seed: 7 }),
      pillow: softBox(0.42, 0.16, 0.66, { radius: 0.075, puff: 0.05, wrinkle: 0.006, seed: 9 }),
      cushion: softBox(0.36, 0.34, 0.12, { radius: 0.06, puff: 0.03, wrinkle: 0.004, seed: 11 }),
      throwB: softBox(0.7, 0.04, 0.9, { radius: 0.02, wrinkle: 0.012, seed: 13 }),
    }),
    [],
  );
  return (
    <group>
      <ShadowGroup>
        <mesh geometry={geo.frame} position={[1.55, 0.2, -2.0]}>
          <Fabric color={COL.slate} />
        </mesh>
        {/* ヘッドボード（縦のクッションが4枚） */}
        {[-0.74, -0.25, 0.25, 0.74].map((z) => (
          <mesh key={z} geometry={geo.panel} position={[0.25, 0.68, -2.0 + z]}>
            <Fabric color="#505869" />
          </mesh>
        ))}
        <mesh geometry={geo.mattress} position={[1.6, 0.44, -2.0]}>
          <Fabric color="#e8eaee" sheen={0.2} />
        </mesh>
        <mesh geometry={geo.duvet} position={[1.98, 0.6, -2.0]}>
          <Fabric color="#3f4f6e" sheen={0.7} />
        </mesh>
        <mesh geometry={geo.fold} position={[1.08, 0.62, -2.0]}>
          <Fabric color="#d9dde5" sheen={0.3} />
        </mesh>
        <mesh geometry={geo.pillow} position={[0.62, 0.66, -2.45]} rotation={[0, 0.06, 0.05]}>
          <Fabric color="#f2f3f5" sheen={0.3} />
        </mesh>
        <mesh geometry={geo.pillow} position={[0.62, 0.66, -1.62]} rotation={[0, -0.08, -0.04]}>
          <Fabric color="#c9ced8" sheen={0.3} />
        </mesh>
        <mesh geometry={geo.cushion} position={[0.85, 0.78, -2.1]} rotation={[0.1, 0.5, -0.3]}>
          <Fabric color={COL.teal} sheen={0.5} />
        </mesh>
        <mesh geometry={geo.throwB} position={[2.45, 0.7, -1.7]} rotation={[0, 0.25, 0.02]}>
          <Fabric color="#8a6a9a" sheen={0.8} />
        </mesh>
      </ShadowGroup>
      {children}
    </group>
  );
}

/* ---------- ナイトテーブル（ベッドの足もと） ---------- */
export function HideoutNightstand({ glow }: { glow: THREE.Texture }) {
  const body = useMemo(() => softBox(0.58, 0.56, 0.48, { radius: 0.03, density: 12 }), []);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (light.current) light.current.intensity = 4 + Math.sin(clock.elapsedTime * 1.3) * 0.3;
  });
  return (
    <group position={[2.55, 0, -0.5]}>
      <ShadowGroup>
        <mesh geometry={body} position={[0, 0.3, 0]}>
          <Matte color={COL.white} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.3, 0.245]}>
          <boxGeometry args={[0.46, 0.006, 0.006]} />
          <Matte color="#c9ccd2" />
        </mesh>
        {/* きのこ型のランプ */}
        <mesh position={[-0.1, 0.66, -0.05]}>
          <cylinderGeometry args={[0.025, 0.04, 0.16, 20]} />
          <Matte color="#f4f1ea" roughness={0.3} />
        </mesh>
        {/* スマートスピーカー */}
        <mesh position={[0.15, 0.63, 0.08]}>
          <cylinderGeometry args={[0.05, 0.05, 0.1, 24]} />
          <Fabric color="#30343d" />
        </mesh>
        <mesh position={[0.15, 0.682, 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.035, 0.042, 32]} />
          <Emissive color={COL.teal} strength={2} />
        </mesh>
      </ShadowGroup>
      <mesh position={[-0.1, 0.76, -0.05]}>
        <sphereGeometry args={[0.1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Emissive color="#ffcf8a" strength={1.6} />
      </mesh>
      <pointLight ref={light} position={[-0.1, 0.8, -0.05]} color="#ffb066" intensity={4} distance={3.5} decay={2} />
      <Glow position={[-0.1, 0.78, -0.05]} color="#ffb066" size={1.1} opacity={0.4} map={glow} />
    </group>
  );
}

/* ---------- ラグ ---------- */
export function HideoutRug() {
  const tex = useHideoutTextures();
  const geo = useMemo(() => softBox(2.5, 0.025, 1.75, { radius: 0.012, wrinkle: 0.0015, density: 20 }), []);
  return (
    <mesh geometry={geo} position={[-0.1, 0.013, 1.0]} receiveShadow>
      <meshPhysicalMaterial map={tex.rug} roughness={1} sheen={0.6} sheenRoughness={0.9} sheenColor="#9ab" />
    </mesh>
  );
}

/* ---------- ソファ ---------- */
export function HideoutSofa() {
  const geo = useMemo(
    () => ({
      base: softBox(1.6, 0.24, 0.82, { radius: 0.06, density: 16 }),
      seat: softBox(0.76, 0.16, 0.68, { radius: 0.06, puff: 0.03, wrinkle: 0.004 }),
      back: softBox(0.76, 0.44, 0.18, { radius: 0.07, puff: 0.025, wrinkle: 0.005, seed: 5 }),
      arm: softBox(0.16, 0.44, 0.82, { radius: 0.07, puff: 0.01 }),
      pillow: softBox(0.36, 0.34, 0.12, { radius: 0.06, puff: 0.03, wrinkle: 0.004, seed: 17 }),
      blanket: softBox(0.5, 0.05, 0.86, { radius: 0.022, wrinkle: 0.014, seed: 19 }),
    }),
    [],
  );
  return (
    <group position={[2.3, 0, 0.7]} rotation={[0, -Math.PI / 2, 0]}>
      <ShadowGroup>
        <mesh geometry={geo.base} position={[0, 0.2, 0]}>
          <Fabric color={COL.fabric} />
        </mesh>
        {[-0.38, 0.38].map((x, i) => (
          <mesh key={x} geometry={geo.seat} position={[x, 0.39, 0.06]} rotation={[0, i ? 0.02 : -0.02, 0]}>
            <Fabric color={COL.fabric} />
          </mesh>
        ))}
        {[-0.38, 0.38].map((x) => (
          <mesh key={x} geometry={geo.back} position={[x, 0.62, -0.29]} rotation={[-0.14, 0, 0]}>
            <Fabric color={COL.fabric} />
          </mesh>
        ))}
        {[-0.82, 0.82].map((x) => (
          <mesh key={x} geometry={geo.arm} position={[x, 0.36, 0]}>
            <Fabric color={COL.fabric} />
          </mesh>
        ))}
        {[-0.65, 0.65].map((x) => (
          <mesh key={x} position={[x, 0.04, 0.3]}>
            <cylinderGeometry args={[0.02, 0.015, 0.08, 10]} />
            <Matte color={COL.black} roughness={0.3} />
          </mesh>
        ))}
        <mesh geometry={geo.pillow} position={[-0.5, 0.66, -0.12]} rotation={[-0.25, 0.25, 0.12]}>
          <Fabric color={COL.teal} />
        </mesh>
        <mesh geometry={geo.blanket} position={[0.72, 0.6, 0.02]} rotation={[0, 0, -0.3]}>
          <Fabric color="#8a6a9a" sheen={0.8} />
        </mesh>
      </ShadowGroup>
    </group>
  );
}

/* ---------- 本棚（左の壁ぞい。上にぬいぐるみ） ---------- */
const BOOK_COLORS = ["#e76f51", "#2a9d8f", "#e9c46a", "#264653", "#f4a261", "#8ab17d", "#b56576", "#6d6875", "#4a6fa5", "#f1faee"];

function Plushie({ position, color, rotY = 0, scale = 1, ears = "round" }: { position: V3; color: string; rotY?: number; scale?: number; ears?: "round" | "tall" }) {
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      <mesh position={[0, 0.06, 0]} scale={[1, 0.9, 0.85]}>
        <sphereGeometry args={[0.07, 24, 16]} />
        <Fabric color={color} sheen={0.9} />
      </mesh>
      <mesh position={[0, 0.15, 0.01]}>
        <sphereGeometry args={[0.058, 24, 16]} />
        <Fabric color={color} sheen={0.9} />
      </mesh>
      {[-1, 1].map((s) =>
        ears === "round" ? (
          <mesh key={s} position={[s * 0.042, 0.2, 0]}>
            <sphereGeometry args={[0.02, 12, 10]} />
            <Fabric color={color} sheen={0.9} />
          </mesh>
        ) : (
          <mesh key={s} position={[s * 0.025, 0.23, 0]} rotation={[0, 0, -s * 0.2]}>
            <capsuleGeometry args={[0.013, 0.06, 4, 10]} />
            <Fabric color={color} sheen={0.9} />
          </mesh>
        ),
      )}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.02, 0.16, 0.055]}>
          <sphereGeometry args={[0.007, 8, 8]} />
          <Matte color="#111" roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

export function HideoutShelf() {
  const books = useMemo(() => {
    const out: { x: number; y: number; h: number; w: number; c: string; tilt: number }[] = [];
    [0.06, 0.46, 0.86].forEach((y, row) => {
      let x = -0.42;
      let i = row * 7;
      while (x < (row === 1 ? 0.02 : 0.4)) {
        const w = 0.035 + ((i * 17) % 5) * 0.008;
        const h = 0.24 + ((i * 29) % 7) * 0.018;
        out.push({ x: x + w / 2, y, h, w, c: BOOK_COLORS[(i * 7) % BOOK_COLORS.length], tilt: i % 9 === 4 ? 0.18 : 0 });
        x += w + 0.004;
        i++;
      }
    });
    return out;
  }, []);
  const box = useMemo(() => softBox(0.4, 0.3, 0.32, { radius: 0.015, density: 10 }), []);
  return (
    <group position={[-2.72, 0, 0.6]} rotation={[0, Math.PI / 2, 0]}>
      <ShadowGroup>
        {[-0.5, 0.5].map((x) => (
          <RoundedBox key={x} args={[0.04, 1.62, 0.38]} radius={0.012} smoothness={3} position={[x, 0.81, 0]}>
            <Wood color={COL.oakDark} />
          </RoundedBox>
        ))}
        {[0.03, 0.43, 0.83, 1.23, 1.6].map((y) => (
          <RoundedBox key={y} args={[1.0, 0.035, 0.38]} radius={0.01} smoothness={3} position={[0, y, 0]}>
            <Wood color={COL.oak} />
          </RoundedBox>
        ))}
        {/* 白い収納ボックス */}
        <mesh geometry={box} position={[0.25, 0.62, 0]}>
          <Matte color={COL.white} roughness={0.5} />
        </mesh>
        <mesh geometry={box} position={[-0.25, 1.42, 0]} scale={[1, 0.9, 1]}>
          <Matte color={COL.white} roughness={0.5} />
        </mesh>
        {books.map((b, i) => (
          <RoundedBox key={i} args={[b.w, b.h, 0.26]} radius={0.006} smoothness={2} position={[b.x, b.y + b.h / 2 + 0.01, 0.02]} rotation={[0, 0, b.tilt]}>
            <Matte color={b.c} roughness={0.75} />
          </RoundedBox>
        ))}
        {/* ぬいぐるみたち */}
        <Plushie position={[-0.36, 1.62, 0.02]} color="#f28fad" rotY={0.3} />
        <Plushie position={[-0.18, 1.62, 0.04]} color="#8ad6a0" scale={1.15} ears="tall" />
        <Plushie position={[0.02, 1.62, 0.02]} color="#9db4ff" rotY={-0.2} />
        <Plushie position={[0.2, 1.62, 0.03]} color="#c9a0ff" scale={1.2} />
        <Plushie position={[0.38, 1.62, 0.0]} color="#ffd27a" rotY={-0.4} ears="tall" />
        <Plushie position={[0.25, 1.25, 0.05]} color="#ff9a5a" scale={0.9} />
      </ShadowGroup>
    </group>
  );
}

/* ---------- ローテーブル ---------- */
export function HideoutCoffeeTable() {
  const geo = useMemo(
    () => ({
      top: roundedSlab(0.95, 0.6, 0.06, 0.06),
      base: softBox(0.85, 0.28, 0.5, { radius: 0.03, density: 12 }),
    }),
    [],
  );
  return (
    <group position={[-0.65, 0, 1.75]}>
      <ShadowGroup>
        <mesh geometry={geo.base} position={[0, 0.16, 0]}>
          <Matte color="#e4e6ea" roughness={0.45} />
        </mesh>
        <mesh geometry={geo.top} position={[0, 0.33, 0]}>
          <Matte color={COL.white} roughness={0.35} />
        </mesh>
        {/* ゲームのコントローラー */}
        <group position={[0.12, 0.38, 0.05]} rotation={[0, 0.4, 0]}>
          <RoundedBox args={[0.16, 0.035, 0.08]} radius={0.017} smoothness={4}>
            <Matte color="#1f2228" roughness={0.4} />
          </RoundedBox>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.07, -0.004, 0.03]}>
              <sphereGeometry args={[0.035, 16, 12]} />
              <Matte color="#1f2228" roughness={0.4} />
            </mesh>
          ))}
        </group>
        <RoundedBox args={[0.24, 0.03, 0.18]} radius={0.008} smoothness={3} position={[-0.2, 0.375, -0.08]} rotation={[0, -0.3, 0]}>
          <Matte color="#4a6fa5" roughness={0.7} />
        </RoundedBox>
      </ShadowGroup>
    </group>
  );
}

/* ---------- アーチ型のフロアランプ ---------- */
export function ArcLamp({ glow }: { glow: THREE.Texture }) {
  const curve = useMemo(
    () => new THREE.CubicBezierCurve3(new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, 2.2, 0), new THREE.Vector3(0.1, 2.3, 0.9), new THREE.Vector3(0.1, 1.85, 1.15)),
    [],
  );
  return (
    <group position={[-0.55, 0, -2.6]}>
      <ShadowGroup>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.17, 0.18, 0.06, 32]} />
          <meshStandardMaterial color="#e8e6e2" roughness={0.3} />
        </mesh>
        <mesh>
          <tubeGeometry args={[curve, 64, 0.014, 10, false]} />
          <Matte color={COL.black} roughness={0.3} />
        </mesh>
        <mesh position={[0.1, 1.8, 1.15]}>
          <sphereGeometry args={[0.2, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
          <meshStandardMaterial color={COL.black} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
      </ShadowGroup>
      <mesh position={[0.1, 1.76, 1.15]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 32]} />
        <Emissive color="#ffd9a0" strength={2} />
      </mesh>
      <pointLight position={[0.1, 1.6, 1.15]} intensity={3} distance={3} decay={2} color="#ffcf8a" />
      <Glow position={[0.1, 1.72, 1.15]} color="#ffcf8a" size={0.8} opacity={0.35} map={glow} />
    </group>
  );
}

/* ---------- アコースティックギター ---------- */
export function AcousticGuitar() {
  const geo = useMemo(() => {
    // くびれのある胴の輪郭
    const s = new THREE.Shape();
    s.moveTo(0, -0.27);
    s.bezierCurveTo(0.2, -0.27, 0.27, -0.16, 0.25, -0.04);
    s.bezierCurveTo(0.24, 0.04, 0.14, 0.06, 0.15, 0.12);
    s.bezierCurveTo(0.16, 0.18, 0.22, 0.22, 0.18, 0.3);
    s.bezierCurveTo(0.14, 0.36, 0.05, 0.36, 0, 0.35);
    s.bezierCurveTo(-0.05, 0.36, -0.14, 0.36, -0.18, 0.3);
    s.bezierCurveTo(-0.22, 0.22, -0.16, 0.18, -0.15, 0.12);
    s.bezierCurveTo(-0.14, 0.06, -0.24, 0.04, -0.25, -0.04);
    s.bezierCurveTo(-0.27, -0.16, -0.2, -0.27, 0, -0.27);
    return { body: beveledShape(s, 0.08, 0.018) };
  }, []);
  return (
    <group position={[-1.45, 0.02, -2.72]} rotation={[-0.2, 0.25, 0]}>
      <ShadowGroup>
        <mesh geometry={geo.body} position={[0, 0.32, 0]}>
          <meshPhysicalMaterial color="#c47a3c" roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.2} />
        </mesh>
        <mesh position={[0, 0.42, 0.06]}>
          <ringGeometry args={[0.052, 0.062, 40]} />
          <Matte color="#3b2414" />
        </mesh>
        <mesh position={[0, 0.42, 0.059]}>
          <circleGeometry args={[0.052, 40]} />
          <Matte color="#140c06" />
        </mesh>
        <RoundedBox args={[0.14, 0.025, 0.02]} radius={0.008} smoothness={3} position={[0, 0.17, 0.065]}>
          <Matte color="#2a170b" />
        </RoundedBox>
        <RoundedBox args={[0.065, 0.62, 0.035]} radius={0.012} smoothness={3} position={[0, 0.98, 0.02]}>
          <meshPhysicalMaterial color="#5c3a22" roughness={0.5} clearcoat={0.4} />
        </RoundedBox>
        <RoundedBox args={[0.09, 0.17, 0.03]} radius={0.014} smoothness={3} position={[0, 1.36, 0.015]} rotation={[-0.12, 0, 0]}>
          <Matte color="#241509" />
        </RoundedBox>
        {[-0.015, -0.005, 0.005, 0.015].map((x) => (
          <mesh key={x} position={[x, 0.68, 0.045]}>
            <cylinderGeometry args={[0.0012, 0.0012, 1.05, 4]} />
            <meshStandardMaterial color="#e8e2d0" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </ShadowGroup>
    </group>
  );
}

/* ---------- 壁の飾り・LEDテープ・色の照明 ---------- */
export function HideoutDecor() {
  const tex = useHideoutTextures();
  const neonMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    // ネオンがときどきチラッとする
    const t = clock.elapsedTime;
    if (neonMat.current) neonMat.current.opacity = t % 7 > 6.85 ? 0.35 : 1;
  });
  return (
    <group>
      {/* 天井ぞいのLEDテープ（奥はピンク、左は青） */}
      <mesh position={[0, 3.52, -2.93]}>
        <boxGeometry args={[5.9, 0.025, 0.02]} />
        <Emissive color={COL.pink} strength={2.6} />
      </mesh>
      <mesh position={[-2.93, 3.52, 0]}>
        <boxGeometry args={[0.02, 0.025, 5.9]} />
        <Emissive color="#3a7bff" strength={2.6} />
      </mesh>
      {/* ネオンサイン（奥の壁） */}
      <mesh position={[-1.35, 2.45, -2.96]}>
        <planeGeometry args={[1.2, 0.45]} />
        <meshBasicMaterial ref={neonMat} map={tex.neon} transparent toneMapped={false} color={new THREE.Color("#ffffff").multiplyScalar(1.6)} depthWrite={false} />
      </mesh>
      {/* ポスター（左の壁、デスクの上） */}
      <group position={[-2.965, 2.15, -1.25]} rotation={[0, Math.PI / 2, 0]}>
        <RoundedBox args={[0.62, 0.84, 0.025]} radius={0.008} smoothness={2}>
          <Matte color="#15171c" />
        </RoundedBox>
        <mesh position={[0, 0, 0.014]}>
          <planeGeometry args={[0.56, 0.78]} />
          <meshStandardMaterial map={tex.poster} roughness={0.6} />
        </mesh>
      </group>
      {/* 小さな壁掛けの棚（左の壁、本棚の上） */}
      <RoundedBox args={[0.22, 0.03, 0.8]} radius={0.01} smoothness={2} position={[-2.86, 2.1, 0.6]}>
        <Wood color={COL.oak} />
      </RoundedBox>
      <mesh position={[-2.86, 2.2, 0.35]}>
        <cylinderGeometry args={[0.06, 0.05, 0.12, 20]} />
        <Matte color="#e8e6e2" roughness={0.4} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-2.86 + Math.sin(i * 1.6) * 0.05, 2.32 + i * 0.03, 0.35 + Math.cos(i * 1.6) * 0.05]} rotation={[Math.sin(i) * 0.6, i, Math.cos(i) * 0.6]}>
          <sphereGeometry args={[0.06, 12, 8]} />
          <meshStandardMaterial color="#4f8a4c" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[-2.86, 2.2, 0.8]}>
        <boxGeometry args={[0.08, 0.14, 0.2]} />
        <Matte color="#9db4ff" />
      </mesh>
    </group>
  );
}
