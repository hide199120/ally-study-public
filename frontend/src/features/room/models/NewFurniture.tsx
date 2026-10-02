import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Glow, ShadowGroup } from "./shared";

/*
 * バッグから出せる家具（最初はバッグの中にしまってある）。
 * それぞれ「出したときに置かれる場所」に描く
 */

const WOOD = "#c98f52";
const WOOD_DARK = "#8f5f35";

/** 本棚（左の壁ぞい） */
export function Bookshelf() {
  const books = useMemo(() => {
    const colors = ["#e76f51", "#2a9d8f", "#e9c46a", "#264653", "#f4a261", "#8ab17d", "#b5838d", "#6d8fb3"];
    // 段ごとに本を並べる（決まった計算で幅と高さを変える）
    return [0.12, 0.5, 0.88].flatMap((y, row) => {
      let x = -0.4;
      const list: { x: number; y: number; w: number; h: number; c: string; tilt: number }[] = [];
      for (let i = 0; x < 0.3 - row * 0.12; i++) {
        const w = 0.05 + ((i + row) % 3) * 0.015;
        const h = 0.24 + ((i * 5 + row) % 4) * 0.025;
        list.push({ x: x + w / 2, y, w, h, c: colors[(i * 3 + row * 2) % colors.length], tilt: i === 6 - row ? 0.25 : 0 });
        x += w + 0.006;
      }
      return list;
    });
  }, []);

  return (
    <group position={[-2.72, 0, 0.6]} rotation={[0, Math.PI / 2, 0]}>
      <ShadowGroup>
        {/* 側板・天板・底板・背板 */}
        {[-0.48, 0.48].map((x) => (
          <RoundedBox key={x} args={[0.05, 1.26, 0.36]} radius={0.015} smoothness={3} position={[x, 0.63, 0]}>
            <meshStandardMaterial color={WOOD} roughness={0.75} />
          </RoundedBox>
        ))}
        <RoundedBox args={[1.02, 0.05, 0.38]} radius={0.015} smoothness={3} position={[0, 1.26, 0]}>
          <meshStandardMaterial color={WOOD} roughness={0.75} />
        </RoundedBox>
        <mesh position={[0, 0.63, -0.17]}>
          <boxGeometry args={[0.92, 1.24, 0.02]} />
          <meshStandardMaterial color="#e9cfa3" roughness={0.9} />
        </mesh>
        {[0.05, 0.43, 0.81].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.92, 0.04, 0.34]} />
            <meshStandardMaterial color={WOOD} roughness={0.75} />
          </mesh>
        ))}
        {/* 本 */}
        {books.map((b, i) => (
          <mesh key={i} position={[b.x, b.y + b.h / 2 - 0.05, 0.01]} rotation={[0, 0, b.tilt]}>
            <boxGeometry args={[b.w, b.h, 0.24]} />
            <meshStandardMaterial color={b.c} roughness={0.8} />
          </mesh>
        ))}
        {/* 小物：地球儀っぽい玉と写真立て */}
        <mesh position={[0.33, 0.59, 0.02]}>
          <sphereGeometry args={[0.1, 20, 20]} />
          <meshStandardMaterial color="#7fb7c9" roughness={0.6} />
        </mesh>
        <mesh position={[0.33, 0.47, 0.02]}>
          <cylinderGeometry args={[0.05, 0.06, 0.04, 14]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
        <RoundedBox args={[0.16, 0.2, 0.03]} radius={0.01} smoothness={2} position={[0.28, 0.93, -0.05]} rotation={[-0.15, 0, 0]}>
          <meshStandardMaterial color="#f3e8cc" />
        </RoundedBox>
        {/* 天板の上の小さな鉢 */}
        <mesh position={[-0.3, 1.34, 0]}>
          <cylinderGeometry args={[0.07, 0.055, 0.12, 16]} />
          <meshStandardMaterial color="#f3e8cc" roughness={0.8} />
        </mesh>
        {[-0.03, 0.03, 0].map((x, i) => (
          <mesh key={i} position={[-0.3 + x, 1.44, i === 2 ? 0.03 : 0]}>
            <sphereGeometry args={[0.055, 12, 12]} />
            <meshStandardMaterial color={["#5f9d57", "#76b565", "#4f8a4c"][i]} roughness={0.7} />
          </mesh>
        ))}
      </ShadowGroup>
    </group>
  );
}

/** ミニソファ（右側。部屋の内側を向く） */
export function Sofa() {
  const fabric = "#dba39a";
  const fabricDark = "#c98d84";
  return (
    <group position={[2.3, 0, 0.7]} rotation={[0, -Math.PI / 2, 0]}>
      <ShadowGroup>
        {/* 座面の土台 */}
        <RoundedBox args={[1.4, 0.3, 0.75]} radius={0.08} smoothness={4} position={[0, 0.27, 0]}>
          <meshStandardMaterial color={fabricDark} roughness={1} />
        </RoundedBox>
        {/* 座クッション */}
        {[-0.33, 0.33].map((x) => (
          <RoundedBox key={x} args={[0.64, 0.14, 0.62]} radius={0.06} smoothness={5} position={[x, 0.48, 0.05]}>
            <meshStandardMaterial color={fabric} roughness={1} />
          </RoundedBox>
        ))}
        {/* 背もたれ */}
        <RoundedBox args={[1.4, 0.55, 0.2]} radius={0.09} smoothness={5} position={[0, 0.65, -0.3]} rotation={[-0.1, 0, 0]}>
          <meshStandardMaterial color={fabricDark} roughness={1} />
        </RoundedBox>
        {/* ひじかけ */}
        {[-0.72, 0.72].map((x) => (
          <RoundedBox key={x} args={[0.16, 0.45, 0.75]} radius={0.07} smoothness={5} position={[x, 0.45, 0]}>
            <meshStandardMaterial color={fabricDark} roughness={1} />
          </RoundedBox>
        ))}
        {/* 脚 */}
        {[
          [-0.6, -0.28],
          [0.6, -0.28],
          [-0.6, 0.28],
          [0.6, 0.28],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.05, z]}>
            <cylinderGeometry args={[0.03, 0.022, 0.1, 10]} />
            <meshStandardMaterial color={WOOD_DARK} />
          </mesh>
        ))}
        {/* クッション */}
        <RoundedBox args={[0.36, 0.34, 0.12]} radius={0.06} smoothness={5} position={[-0.38, 0.72, -0.12]} rotation={[-0.25, 0.15, 0.1]}>
          <meshStandardMaterial color="#f2d58a" roughness={1} />
        </RoundedBox>
        <RoundedBox args={[0.32, 0.3, 0.12]} radius={0.06} smoothness={5} position={[0.42, 0.7, -0.12]} rotation={[-0.25, -0.2, -0.08]}>
          <meshStandardMaterial color="#cfe0b0" roughness={1} />
        </RoundedBox>
      </ShadowGroup>
    </group>
  );
}

/** ビーズクッション（くたっとした形） */
export function Beanbag() {
  return (
    <group position={[0.9, 0, 1.85]} rotation={[0, -0.6, 0]}>
      <ShadowGroup>
        <mesh position={[0, 0.2, 0]} scale={[0.5, 0.24, 0.48]}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshStandardMaterial color="#e8b04b" roughness={1} />
        </mesh>
        {/* 背中側のふくらみ */}
        <mesh position={[0, 0.36, -0.2]} scale={[0.42, 0.26, 0.24]} rotation={[-0.3, 0, 0]}>
          <sphereGeometry args={[1, 28, 20]} />
          <meshStandardMaterial color="#e8b04b" roughness={1} />
        </mesh>
        {/* くぼみ */}
        <mesh position={[0, 0.39, 0.06]} scale={[0.3, 0.06, 0.26]}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#d99d3b" roughness={1} />
        </mesh>
        {/* タグ */}
        <mesh position={[0.36, 0.22, 0.28]} rotation={[0, 0.9, 0]}>
          <boxGeometry args={[0.06, 0.05, 0.005]} />
          <meshStandardMaterial color="#fffaf0" />
        </mesh>
      </ShadowGroup>
    </group>
  );
}

/** ローテーブル（マグカップと本） */
export function LowTable({ glow }: { glow: THREE.Texture }) {
  const steam = useRef<(THREE.Sprite | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    steam.current.forEach((s, i) => {
      if (!s) return;
      const p = (t * 0.35 + i / 3) % 1;
      s.position.set(0.18 + Math.sin(p * 6 + i) * 0.02, 0.5 + p * 0.3, 0.05);
      s.scale.setScalar(0.06 + p * 0.08);
      (s.material as THREE.SpriteMaterial).opacity = Math.sin(p * Math.PI) * 0.35;
    });
  });
  return (
    <group position={[-0.65, 0, 1.75]}>
      <ShadowGroup>
        <mesh position={[0, 0.33, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.05, 40]} />
          <meshStandardMaterial color="#e0aa70" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.305, 0]}>
          <cylinderGeometry args={[0.43, 0.43, 0.02, 40]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
        </mesh>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.3, 0.15, Math.sin(a) * 0.3]}>
              <cylinderGeometry args={[0.025, 0.02, 0.3, 10]} />
              <meshStandardMaterial color={WOOD_DARK} />
            </mesh>
          );
        })}
        {/* マグカップ */}
        <mesh position={[0.18, 0.4, 0.05]}>
          <cylinderGeometry args={[0.045, 0.04, 0.09, 18]} />
          <meshStandardMaterial color="#fffaf0" roughness={0.5} />
        </mesh>
        <mesh position={[0.18, 0.44, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.038, 18]} />
          <meshStandardMaterial color="#7a4a2a" />
        </mesh>
        <mesh position={[0.232, 0.405, 0.05]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.022, 0.007, 6, 14]} />
          <meshStandardMaterial color="#fffaf0" />
        </mesh>
        {/* 本とお菓子のお皿 */}
        <RoundedBox args={[0.28, 0.035, 0.2]} radius={0.01} smoothness={2} position={[-0.12, 0.375, -0.1]} rotation={[0, 0.4, 0]}>
          <meshStandardMaterial color="#2a9d8f" roughness={0.8} />
        </RoundedBox>
        <mesh position={[-0.05, 0.37, 0.2]}>
          <cylinderGeometry args={[0.1, 0.08, 0.02, 24]} />
          <meshStandardMaterial color="#f6ead0" />
        </mesh>
        {[
          [-0.08, 0.18],
          [-0.02, 0.22],
          [-0.04, 0.16],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.39, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.012, 14]} />
            <meshStandardMaterial color={i === 1 ? "#a8703a" : "#d9a066"} />
          </mesh>
        ))}
      </ShadowGroup>
      {/* 湯気 */}
      {[0, 1, 2].map((i) => (
        <sprite
          key={i}
          ref={(el) => {
            steam.current[i] = el;
          }}
        >
          <spriteMaterial map={glow} color="#ffffff" transparent depthWrite={false} opacity={0} />
        </sprite>
      ))}
    </group>
  );
}

/** フロアランプ（奥の壁の前。ほんのり光る） */
export function FloorLamp({ glow }: { glow: THREE.Texture }) {
  return (
    <group position={[-0.55, 0, -2.6]}>
      <ShadowGroup>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.18, 0.2, 0.04, 24]} />
          <meshStandardMaterial color="#6e4a2c" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 1.56, 10]} />
          <meshStandardMaterial color="#6e4a2c" roughness={0.6} />
        </mesh>
      </ShadowGroup>
      <mesh position={[0, 1.66, 0]}>
        <cylinderGeometry args={[0.16, 0.26, 0.3, 28, 1, true]} />
        <meshStandardMaterial color="#fff0c8" emissive="#ffd88a" emissiveIntensity={0.85} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
      <pointLight position={[0, 1.6, 0]} color="#ffc777" intensity={3.2} distance={4} decay={2} />
      <Glow position={[0, 1.62, 0]} color="#ffd27a" size={1.2} opacity={0.3} map={glow} />
    </group>
  );
}

/** ギター（壁に立てかける） */
export function Guitar() {
  return (
    <group position={[-1.45, 0, -2.72]} rotation={[-0.22, 0.25, 0]}>
      <ShadowGroup>
        {/* ボディ（くびれのある形を球2つで） */}
        <mesh position={[0, 0.28, 0]} scale={[1, 1, 0.32]}>
          <sphereGeometry args={[0.24, 28, 20]} />
          <meshStandardMaterial color="#d9873e" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.58, 0]} scale={[1, 1, 0.32]}>
          <sphereGeometry args={[0.18, 28, 20]} />
          <meshStandardMaterial color="#d9873e" roughness={0.45} />
        </mesh>
        {/* サウンドホール */}
        <mesh position={[0, 0.48, 0.06]}>
          <circleGeometry args={[0.06, 20]} />
          <meshStandardMaterial color="#3b2414" />
        </mesh>
        {/* ブリッジ */}
        <mesh position={[0, 0.26, 0.075]}>
          <boxGeometry args={[0.16, 0.03, 0.02]} />
          <meshStandardMaterial color="#3b2414" />
        </mesh>
        {/* ネックとヘッド */}
        <mesh position={[0, 1.0, 0.02]}>
          <boxGeometry args={[0.07, 0.62, 0.035]} />
          <meshStandardMaterial color="#6e4526" roughness={0.6} />
        </mesh>
        <RoundedBox args={[0.1, 0.17, 0.04]} radius={0.015} smoothness={2} position={[0, 1.38, 0.015]}>
          <meshStandardMaterial color="#3b2414" roughness={0.6} />
        </RoundedBox>
        {[-1, 1].flatMap((s) =>
          [0, 1, 2].map((k) => (
            <mesh key={`${s}-${k}`} position={[s * 0.065, 1.33 + k * 0.045, 0.015]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.008, 0.008, 0.03, 6]} />
              <meshStandardMaterial color="#e8e2d0" metalness={0.6} roughness={0.3} />
            </mesh>
          )),
        )}
        {/* 弦 */}
        {[-0.02, -0.007, 0.007, 0.02].map((x) => (
          <mesh key={x} position={[x, 0.8, 0.065]}>
            <boxGeometry args={[0.003, 1.1, 0.003]} />
            <meshStandardMaterial color="#f2efe6" metalness={0.5} roughness={0.3} />
          </mesh>
        ))}
      </ShadowGroup>
    </group>
  );
}

/** 金魚鉢（台の上で金魚が泳ぐ） */
export function Fishbowl() {
  const fish = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.8;
    if (fish.current) {
      fish.current.position.set(Math.cos(t) * 0.09, 0.73 + Math.sin(t * 2.3) * 0.015, Math.sin(t) * 0.09);
      fish.current.rotation.y = -t;
    }
  });
  return (
    <group position={[-1.0, 0, -0.35]}>
      <ShadowGroup>
        {/* 台 */}
        <mesh position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.04, 28]} />
          <meshStandardMaterial color="#e0aa70" roughness={0.7} />
        </mesh>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.13, 0.13, Math.sin(a) * 0.13]} rotation={[Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12]}>
              <cylinderGeometry args={[0.018, 0.015, 0.27, 8]} />
              <meshStandardMaterial color={WOOD_DARK} />
            </mesh>
          );
        })}
        {/* 砂利と水草 */}
        <mesh position={[0, 0.33, 0]}>
          <cylinderGeometry args={[0.13, 0.1, 0.04, 24]} />
          <meshStandardMaterial color="#e9d9b4" roughness={1} />
        </mesh>
        {[-0.05, 0.04].map((x, i) => (
          <mesh key={x} position={[x, 0.42, i ? 0.03 : -0.02]} rotation={[0, 0, x * 3]}>
            <capsuleGeometry args={[0.015, 0.14, 4, 8]} />
            <meshStandardMaterial color={i ? "#5f9d57" : "#76b565"} />
          </mesh>
        ))}
      </ShadowGroup>
      {/* 金魚 */}
      <group ref={fish}>
        <mesh scale={[1, 0.7, 0.5]}>
          <sphereGeometry args={[0.035, 14, 12]} />
          <meshStandardMaterial color="#f07a3a" roughness={0.5} />
        </mesh>
        <mesh position={[-0.045, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.3]}>
          <coneGeometry args={[0.025, 0.04, 10]} />
          <meshStandardMaterial color="#f59a5a" roughness={0.5} />
        </mesh>
      </group>
      {/* 水とガラス（透明なものは最後に描く） */}
      <mesh position={[0, 0.66, 0]} scale={[1, 0.82, 1]}>
        <sphereGeometry args={[0.2, 28, 20, 0, Math.PI * 2, Math.PI * 0.32, Math.PI * 0.68]} />
        <meshStandardMaterial color="#9fd6e8" transparent opacity={0.35} roughness={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.66, 0]}>
        <sphereGeometry args={[0.22, 32, 24, 0, Math.PI * 2, Math.PI * 0.18, Math.PI * 0.82]} />
        <meshStandardMaterial color="#e8f6ff" transparent opacity={0.22} roughness={0.05} metalness={0.1} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.008, 8, 28]} />
        <meshStandardMaterial color="#e8f6ff" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/** サボテン（花つき） */
export function Cactus() {
  const green = "#6aa65f";
  return (
    <group position={[1.75, 0, 2.6]}>
      <ShadowGroup>
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.14, 0.11, 0.22, 20]} />
          <meshStandardMaterial color="#e9a07a" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.215, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.02, 20]} />
          <meshStandardMaterial color="#c9a27a" roughness={1} />
        </mesh>
        {/* 本体と腕 */}
        <mesh position={[0, 0.48, 0]}>
          <capsuleGeometry args={[0.09, 0.4, 8, 16]} />
          <meshStandardMaterial color={green} roughness={0.8} />
        </mesh>
        <mesh position={[0.13, 0.5, 0]} rotation={[0, 0, -0.2]}>
          <capsuleGeometry args={[0.05, 0.14, 6, 12]} />
          <meshStandardMaterial color={green} roughness={0.8} />
        </mesh>
        <mesh position={[0.1, 0.42, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.045, 0.06, 6, 12]} />
          <meshStandardMaterial color={green} roughness={0.8} />
        </mesh>
        <mesh position={[-0.12, 0.42, 0.02]} rotation={[0, 0, 0.25]}>
          <capsuleGeometry args={[0.045, 0.1, 6, 12]} />
          <meshStandardMaterial color={green} roughness={0.8} />
        </mesh>
        {/* 花 */}
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.03, 0.8, Math.sin(a) * 0.03]}>
              <sphereGeometry args={[0.025, 10, 10]} />
              <meshStandardMaterial color="#f28482" roughness={0.7} />
            </mesh>
          );
        })}
        <mesh position={[0, 0.81, 0]}>
          <sphereGeometry args={[0.018, 10, 10]} />
          <meshStandardMaterial color="#f6bd60" />
        </mesh>
      </ShadowGroup>
    </group>
  );
}
