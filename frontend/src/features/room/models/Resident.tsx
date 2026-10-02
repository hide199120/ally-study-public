import { useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Avatar } from "../catalog";
import { Limb, ShadowGroup } from "./shared";
import { easeInOut, type V3 } from "./utils";

const SKIN = "#f7d2b0";

/** 住人ごとの見た目（髪型と服の色） */
const LOOKS: Record<Avatar, { hair: string; top: string; bottom: string; socks: string }> = {
  girl: { hair: "#6b3f24", top: "#9cc472", bottom: "#e9dcc4", socks: "#f8f1e2" },
  boy: { hair: "#3f2a1c", top: "#7da7d4", bottom: "#5f6f86", socks: "#f2efe8" },
};

const shoulderL: V3 = [-0.21, 0.58, 0];
const shoulderR: V3 = [0.21, 0.58, 0];
const elbowL: V3 = [-0.29, 0.36, 0.1];
const elbowR: V3 = [0.29, 0.36, 0.1];
const handL: V3 = [-0.2, 0.34, 0.36];
const handR: V3 = [0.2, 0.34, 0.36];

/** あぐらをかいて本を読む住人（女の子 / 男の子） */
export default function Resident({ avatar, position }: { avatar: Avatar; position: V3 }) {
  const chest = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);
  const page = useRef<THREE.Group>(null);
  const look = LOOKS[avatar];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (chest.current) chest.current.scale.set(1, 1 + Math.sin(t * 1.6) * 0.014, 1 + Math.sin(t * 1.6) * 0.01);
    if (head.current) {
      head.current.rotation.x = 0.3 + Math.sin(t * 0.7) * 0.03;
      head.current.rotation.y = Math.sin(t * 0.4) * 0.09;
    }
    if (tail.current) {
      tail.current.rotation.z = Math.sin(t * 2.1) * 0.12;
      tail.current.rotation.x = Math.sin(t * 1.7) * 0.06;
    }
    const b = t % 4.2 > 4.08 ? 0.12 : 1;
    if (eyeL.current) eyeL.current.scale.y = b;
    if (eyeR.current) eyeR.current.scale.y = b;
    if (page.current) {
      const ph = (t % 9) / 9;
      if (ph > 0.7 && ph < 0.8) {
        page.current.visible = true;
        page.current.rotation.z = Math.PI * easeInOut((ph - 0.7) / 0.1);
      } else page.current.visible = false;
    }
  });

  return (
    <group position={position} scale={1.25}>
      {/* 住人を切り替えたら影の設定をやり直すため key を付ける */}
      <ShadowGroup key={avatar}>
        {/* 脚（あぐら） */}
        <mesh position={[0, 0.1, 0.17]} scale={[0.42, 0.13, 0.27]}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial color={look.bottom} roughness={0.9} />
        </mesh>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 0.07, 0.4]} scale={[0.09, 0.055, 0.12]}>
            <sphereGeometry args={[1, 14, 14]} />
            <meshStandardMaterial color={look.socks} />
          </mesh>
        ))}

        {/* 胴体 */}
        <group ref={chest} position={[0, 0.1, 0]} rotation={[-0.1, 0, 0]}>
          <mesh position={[0, 0.3, 0]} scale={[1, 1, 0.78]}>
            <capsuleGeometry args={[0.2, 0.28, 8, 18]} />
            <meshStandardMaterial color={look.top} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.6, 0.01]}>
            <cylinderGeometry args={[0.055, 0.06, 0.1, 14]} />
            <meshStandardMaterial color={SKIN} roughness={0.8} />
          </mesh>
          {avatar === "boy" && (
            <>
              {/* パーカーのフードとひも */}
              <mesh position={[0, 0.55, -0.1]} rotation={[0.5, 0, 0]} scale={[1, 0.8, 1]}>
                <torusGeometry args={[0.1, 0.045, 10, 20]} />
                <meshStandardMaterial color={look.top} roughness={0.9} />
              </mesh>
              {[-0.04, 0.04].map((x) => (
                <mesh key={x} position={[x, 0.45, 0.155]}>
                  <cylinderGeometry args={[0.006, 0.006, 0.12, 6]} />
                  <meshStandardMaterial color="#f4efe2" />
                </mesh>
              ))}
            </>
          )}
        </group>

        {/* 腕 */}
        <Limb a={shoulderL} b={elbowL} r={0.055} color={look.top} />
        <Limb a={elbowL} b={handL} r={0.05} color={look.top} />
        <Limb a={shoulderR} b={elbowR} r={0.055} color={look.top} />
        <Limb a={elbowR} b={handR} r={0.05} color={look.top} />
        {[handL, handR].map((h, i) => (
          <mesh key={i} position={h}>
            <sphereGeometry args={[0.05, 14, 14]} />
            <meshStandardMaterial color={SKIN} roughness={0.8} />
          </mesh>
        ))}

        {/* 本 */}
        <group position={[0, 0.34, 0.36]} rotation={[-0.55, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.54, 0.02, 0.36]} />
            <meshStandardMaterial color={avatar === "boy" ? "#c96f4a" : "#3f6f6a"} roughness={0.8} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.131, 0.02, 0]}>
              <boxGeometry args={[0.255, 0.026, 0.33]} />
              <meshStandardMaterial color="#fffaf0" roughness={0.9} />
            </mesh>
          ))}
          <group ref={page} position={[0, 0.036, 0]} visible={false}>
            <mesh position={[0.125, 0, 0]}>
              <boxGeometry args={[0.25, 0.004, 0.32]} />
              <meshStandardMaterial color="#fffdf3" roughness={0.9} />
            </mesh>
          </group>
        </group>

        {/* 頭 */}
        <group ref={head} position={[0, 0.84, 0.02]}>
          <mesh scale={[1, 1.06, 1]}>
            <sphereGeometry args={[0.17, 32, 32]} />
            <meshStandardMaterial color={SKIN} roughness={0.75} />
          </mesh>
          {avatar === "girl" ? <GirlHair color={look.hair} tail={tail} /> : <BoyHair color={look.hair} />}
          {[-0.17, 0.17].map((x) => (
            <mesh key={x} position={[x, -0.01, 0]}>
              <sphereGeometry args={[0.033, 12, 12]} />
              <meshStandardMaterial color={SKIN} />
            </mesh>
          ))}
          {/* 顔 */}
          <mesh ref={eyeL} position={[-0.062, -0.012, 0.153]} scale={[1, 1.4, 0.6]}>
            <sphereGeometry args={[0.017, 12, 12]} />
            <meshStandardMaterial color="#2a1a10" roughness={0.3} />
          </mesh>
          <mesh ref={eyeR} position={[0.062, -0.012, 0.153]} scale={[1, 1.4, 0.6]}>
            <sphereGeometry args={[0.017, 12, 12]} />
            <meshStandardMaterial color="#2a1a10" roughness={0.3} />
          </mesh>
          {[-0.1, 0.1].map((x) => (
            <mesh key={x} position={[x, -0.06, 0.13]} scale={[1.2, 0.7, 0.4]}>
              <sphereGeometry args={[0.027, 12, 12]} />
              <meshStandardMaterial color="#f6a79b" transparent opacity={avatar === "girl" ? 0.65 : 0.4} />
            </mesh>
          ))}
        </group>
      </ShadowGroup>
    </group>
  );
}

/** 女の子：前髪＋ゆれるポニーテール */
function GirlHair({ color, tail }: { color: string; tail: RefObject<THREE.Group | null> }) {
  return (
    <>
      <mesh position={[0, 0.015, -0.035]}>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.035, 0.0]} rotation={[-0.02, 0, 0]}>
        <sphereGeometry args={[0.18, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.4]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <group ref={tail} position={[0, 0.07, -0.17]}>
        <mesh position={[0, -0.03, -0.04]} rotation={[0.5, 0, 0]}>
          <capsuleGeometry args={[0.055, 0.2, 6, 14]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.04, 0.012, 8, 16]} />
          <meshStandardMaterial color="#e07a5f" />
        </mesh>
      </group>
    </>
  );
}

/** 男の子：短めの髪＋ちょんと跳ねた毛 */
function BoyHair({ color }: { color: string }) {
  return (
    <>
      {/* 後ろ〜横（首のあたりは出す） */}
      <mesh position={[0, 0.03, -0.02]} rotation={[-0.35, 0, 0]}>
        <sphereGeometry args={[0.178, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* 前髪 */}
      {[-0.07, 0, 0.07].map((x, i) => (
        <mesh key={x} position={[x, 0.085 - (i % 2) * 0.01, 0.125]} rotation={[0.5, 0, x * 2.2]} scale={[1, 0.6, 0.5]}>
          <sphereGeometry args={[0.065, 14, 14]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
      {/* アホ毛 */}
      <mesh position={[0.02, 0.2, -0.02]} rotation={[-0.4, 0, -0.5]}>
        <coneGeometry args={[0.025, 0.09, 8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </>
  );
}
