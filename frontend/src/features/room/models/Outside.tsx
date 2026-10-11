import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { SceneLook } from "../../theme/themes";
import { Glow } from "./shared";
import { makeTexture } from "./utils";

/* 窓の外の景色（テーマごと）。座標は窓の中心の少し奥を原点にしている */

type Props = { look: SceneLook; glow: THREE.Texture };

/** 決まった並びの乱数（毎回同じ景色にするため） */
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function Sky({ colors }: { colors: [string, string, string] }) {
  const tex = useMemo(
    () =>
      makeTexture(8, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, colors[0]);
        gr.addColorStop(0.55, colors[1]);
        gr.addColorStop(1, colors[2]);
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
      }),
    [colors],
  );
  return (
    <mesh position={[0, 2.2, -1.2]}>
      <planeGeometry args={[16, 10]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

function Orb({ position, color, size, glow, strength = 1 }: { position: [number, number, number]; color: string; size: number; glow: THREE.Texture; strength?: number }) {
  return (
    <>
      <Glow position={[position[0], position[1], position[2] - 0.05]} color={color} size={size * 11} opacity={0.75 * strength} map={glow} />
      <mesh position={position}>
        <circleGeometry args={[size, 40]} />
        <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(1.6)} toneMapped={false} />
      </mesh>
    </>
  );
}

function Stars({ count = 70, seed = 7 }: { count?: number; seed?: number }) {
  const geo = useMemo(() => {
    const r = rand(seed);
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (r() - 0.5) * 6;
      p[i * 3 + 1] = 1.6 + r() * 3;
      p[i * 3 + 2] = -1.1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [count, seed]);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffffff" size={0.035} sizeAttenuation transparent opacity={0.9} toneMapped={false} />
    </points>
  );
}

/** 窓ガラスの向こうを落ちる雨すじ */
function RainStreaks({ count = 90, color = "#b9cbe6" }: { count?: number; color?: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const r = rand(42);
    return Array.from({ length: count }, () => ({ x: (r() - 0.5) * 3.4, y: r() * 4, z: -0.6 + r() * 1.4, sp: 3.5 + r() * 2.5, len: 0.18 + r() * 0.22 }));
  }, [count]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    data.forEach((d, i) => {
      d.y -= d.sp * Math.min(dt, 0.05);
      if (d.y < -0.2) d.y = 4.2;
      m.makeScale(1, d.len, 1);
      m.setPosition(d.x, d.y, d.z);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <planeGeometry args={[0.008, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />
    </instancedMesh>
  );
}

/** 夜の建物（窓の明かり付き） */
function Buildings({ seed, count, baseY, tint, lit = 0.35, zBase = -0.9, height = [1.2, 3.4] }: { seed: number; count: number; baseY: number; tint: string; lit?: number; zBase?: number; height?: [number, number] }) {
  const windowTex = useMemo(() => {
    const r = rand(seed * 3 + 1);
    const t = makeTexture(64, 128, (g, w, h) => {
      g.fillStyle = tint;
      g.fillRect(0, 0, w, h);
      for (let y = 6; y < h - 4; y += 9) {
        for (let x = 5; x < w - 4; x += 9) {
          if (r() < lit) {
            const warm = r() < 0.7;
            g.fillStyle = warm ? `hsl(${38 + r() * 12}, 100%, ${70 + r() * 15}%)` : `hsl(${200 + r() * 80}, 90%, ${72 + r() * 10}%)`;
            g.fillRect(x, y, 5, 5);
          }
        }
      }
    });
    t.magFilter = THREE.NearestFilter;
    return t;
  }, [seed, tint, lit]);
  const blocks = useMemo(() => {
    const r = rand(seed);
    let x = -3;
    const out: { x: number; w: number; h: number; z: number }[] = [];
    for (let i = 0; i < count && x < 3.2; i++) {
      const w = 0.35 + r() * 0.55;
      const h = height[0] + r() * (height[1] - height[0]);
      out.push({ x: x + w / 2, w, h, z: zBase + r() * 0.2 });
      x += w + r() * 0.08;
    }
    return out;
  }, [seed, count, zBase, height]);
  return (
    <group>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, baseY + b.h / 2, b.z]}>
          <planeGeometry args={[b.w, b.h]} />
          <meshBasicMaterial map={windowTex} color="#ffffff" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Hill({ position, scale, color }: { position: [number, number, number]; scale: [number, number, number]; color: string }) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 32, 16]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function ForestView({ look, glow }: Props) {
  const leaves = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (leaves.current) leaves.current.rotation.z = Math.sin(clock.elapsedTime * 0.7) * 0.025;
  });
  return (
    <>
      <Sky colors={look.sky} />
      <Orb position={[0.7, 2.9, -1.0]} color={look.orb} size={0.28} glow={glow} />
      <Hill position={[-0.6, 0.6, -0.8]} scale={[3.4, 1.1, 1]} color="#6aa65f" />
      <Hill position={[1.6, 0.3, -0.4]} scale={[3.2, 1.0, 1]} color="#4f8a4c" />
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
    </>
  );
}

function NightView({ look, glow }: Props) {
  return (
    <>
      <Sky colors={look.sky} />
      <Stars />
      <Orb position={[0.9, 3.2, -1.0]} color={look.orb} size={0.22} glow={glow} strength={0.8} />
      <Hill position={[-0.8, 0.5, -0.8]} scale={[3.4, 1.1, 1]} color="#141a2c" />
      <Hill position={[1.6, 0.2, -0.4]} scale={[3.2, 1.0, 1]} color="#0d1220" />
      {/* 遠くの家の明かり */}
      {[
        [-1.1, 1.25, "#ffb24d"],
        [-0.3, 1.1, "#ffd27a"],
        [0.4, 0.95, "#ffb24d"],
        [1.2, 0.9, "#7ff5e6"],
      ].map(([x, y, c], i) => (
        <Glow key={i} position={[x as number, y as number, 0.7]} color={c as string} size={0.35} opacity={0.9} map={glow} />
      ))}
    </>
  );
}

function RainView({ look, glow }: Props) {
  // 雨でにじんだ街の明かり
  const bokeh = useMemo(() => {
    const r = rand(11);
    const colors = ["#ffb35c", "#ffd27a", "#8ab4f8", "#f28fad", "#ffe0a0"];
    return Array.from({ length: 16 }, () => ({ x: (r() - 0.5) * 3.2, y: 0.9 + r() * 1.6, s: 0.25 + r() * 0.45, c: colors[Math.floor(r() * colors.length)] }));
  }, []);
  return (
    <>
      <Sky colors={look.sky} />
      <Buildings seed={5} count={12} baseY={0.3} tint="#18212f" lit={0.25} zBase={-1.0} height={[1.4, 3.2]} />
      {bokeh.map((b, i) => (
        <Glow key={i} position={[b.x, b.y, -0.2]} color={b.c} size={b.s} opacity={0.55} map={glow} />
      ))}
      {/* 雨の幕（少し白くかすませる） */}
      <mesh position={[0, 2, 0.3]}>
        <planeGeometry args={[8, 6]} />
        <meshBasicMaterial color="#9fb3cc" transparent opacity={0.16} toneMapped={false} />
      </mesh>
      <RainStreaks />
    </>
  );
}

function SunsetView({ look, glow }: Props) {
  return (
    <>
      <Sky colors={look.sky} />
      <Orb position={[0.6, 1.35, -1.0]} color={look.orb} size={0.38} glow={glow} strength={1.2} />
      {/* 遠くの山（シルエット） */}
      <Hill position={[-1.2, 0.9, -0.9]} scale={[2.4, 1.0, 1]} color="#7a4a6a" />
      <Hill position={[1.4, 0.8, -0.85]} scale={[2.6, 0.85, 1]} color="#8a5068" />
      {/* 田んぼ */}
      <mesh position={[0, 0.55, 0.2]} rotation={[-1.25, 0, 0]}>
        <planeGeometry args={[8, 2.2]} />
        <meshStandardMaterial color="#d9a24a" roughness={1} />
      </mesh>
      {[0.66, 0.78, 0.9].map((y, i) => (
        <mesh key={i} position={[0, y, 0.35 - i * 0.1]}>
          <planeGeometry args={[8, 0.015]} />
          <meshBasicMaterial color="#ffe0a0" transparent opacity={0.5} toneMapped={false} />
        </mesh>
      ))}
      {/* 電柱と電線 */}
      {[-1.3, 1.5].map((x, i) => (
        <group key={i} position={[x, 0.6, 0.5]}>
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[0.05, 2.2, 0.05]} />
            <meshBasicMaterial color="#2a1a22" />
          </mesh>
          <mesh position={[0, 1.95, 0]}>
            <boxGeometry args={[0.4, 0.04, 0.04]} />
            <meshBasicMaterial color="#2a1a22" />
          </mesh>
        </group>
      ))}
      {[2.52, 2.6].map((y, i) => (
        <mesh key={i} position={[0.1, y - 0.05, 0.5]} rotation={[0, 0, -0.01]}>
          <boxGeometry args={[3.0, 0.008, 0.008]} />
          <meshBasicMaterial color="#2a1a22" />
        </mesh>
      ))}
      {/* カラス */}
      {[
        [-0.4, 2.6],
        [-0.15, 2.75],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0]} rotation={[0, 0, i ? 0.2 : -0.1]}>
          <planeGeometry args={[0.1, 0.02]} />
          <meshBasicMaterial color="#3a2030" />
        </mesh>
      ))}
    </>
  );
}

function CityView({ look, glow }: Props) {
  return (
    <>
      <Sky colors={look.sky} />
      <Stars count={30} seed={3} />
      <Orb position={[1.3, 3.3, -1.0]} color={look.orb} size={0.18} glow={glow} strength={0.7} />
      <Buildings seed={9} count={14} baseY={0.0} tint="#1b1530" lit={0.3} zBase={-1.0} height={[1.6, 3.6]} />
      <Buildings seed={21} count={10} baseY={-0.2} tint="#120e22" lit={0.45} zBase={-0.5} height={[1.0, 2.4]} />
      {/* ネオン */}
      <Glow position={[-0.9, 1.6, -0.3]} color="#ff4fd8" size={0.9} opacity={0.8} map={glow} />
      <mesh position={[-0.9, 1.6, -0.25]}>
        <planeGeometry args={[0.32, 0.08]} />
        <meshBasicMaterial color={new THREE.Color("#ff6fe0").multiplyScalar(2)} toneMapped={false} />
      </mesh>
      <Glow position={[0.95, 1.2, -0.3]} color="#4fc3ff" size={0.8} opacity={0.7} map={glow} />
      <mesh position={[0.95, 1.2, -0.25]}>
        <planeGeometry args={[0.08, 0.36]} />
        <meshBasicMaterial color={new THREE.Color("#6fd6ff").multiplyScalar(2)} toneMapped={false} />
      </mesh>
      {/* 地上の明かりのもや */}
      <Glow position={[0, 0.4, 0.2]} color="#b56cff" size={4} opacity={0.5} map={glow} />
    </>
  );
}

export default function OutsideView(props: Props) {
  switch (props.look.outside) {
    case "night":
      return <NightView {...props} />;
    case "rain":
      return <RainView {...props} />;
    case "sunset":
      return <SunsetView {...props} />;
    case "city":
      return <CityView {...props} />;
    default:
      return <ForestView {...props} />;
  }
}
