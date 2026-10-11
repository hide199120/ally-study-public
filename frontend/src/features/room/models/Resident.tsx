import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Avatar } from "../catalog";
import { Limb, ShadowGroup } from "./shared";
import { softBox } from "./geometry";
import { easeInOut, type V3 } from "./utils";

const SKIN = "#f6d0ae";

/** 住人ごとの見た目（髪と服の色） */
const LOOKS: Record<Avatar, { hair: string; top: string; topDark: string; bottom: string; shoes: string; book: string }> = {
  girl: { hair: "#5a3420", top: "#a8cf86", topDark: "#86b066", bottom: "#e8dcc6", shoes: "#f6f2ea", book: "#3f6f6a" },
  boy: { hair: "#33241a", top: "#7fa8d6", topDark: "#5f88b8", bottom: "#4e5d74", shoes: "#f2efe8", book: "#c96f4a" },
};

/** どんな姿勢で過ごしているか */
export type ResidentPose = "reading" | "desk";

type Props = {
  avatar: Avatar;
  position: V3;
  pose?: ResidentPose;
  /** ヘッドホンを付けるか */
  headphones?: boolean;
  rotationY?: number;
};

/** 肌・布のマテリアル（少しだけ光沢を持たせて、のっぺりしないようにする） */
function Skin() {
  return <meshPhysicalMaterial color={SKIN} roughness={0.62} sheen={0.4} sheenColor="#ffd9c4" />;
}
function Cloth({ color }: { color: string }) {
  return <meshPhysicalMaterial color={color} roughness={0.9} sheen={0.7} sheenRoughness={0.7} sheenColor="#ffffff" />;
}

/**
 * 部屋の住人。reading はあぐらで本を読む姿勢、desk はイスに座ってキーボードを打つ姿勢
 */
export default function Resident({ avatar, position, pose = "reading", headphones = false, rotationY = 0 }: Props) {
  const chest = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const page = useRef<THREE.Group>(null);
  const handL = useRef<THREE.Group>(null);
  const handR = useRef<THREE.Group>(null);
  const look = LOOKS[avatar];
  const desk = pose === "desk";

  const geo = useMemo(
    () => ({
      torso: softBox(0.4, 0.46, 0.27, { radius: 0.12, puff: 0, wrinkle: 0.003, seed: 3 }),
      pocket: softBox(0.22, 0.09, 0.03, { radius: 0.014 }),
      hood: new THREE.TorusGeometry(0.12, 0.05, 14, 28, Math.PI * 1.25),
    }),
    [],
  );

  // 腕の形（姿勢ごと）
  const arm = desk
    ? { shoulderL: [-0.2, 0.56, 0] as V3, elbowL: [-0.24, 0.32, 0.14] as V3, handL: [-0.13, 0.27, 0.42] as V3, shoulderR: [0.2, 0.56, 0] as V3, elbowR: [0.24, 0.32, 0.14] as V3, handR: [0.13, 0.27, 0.42] as V3 }
    : { shoulderL: [-0.2, 0.56, 0] as V3, elbowL: [-0.28, 0.35, 0.1] as V3, handL: [-0.19, 0.34, 0.35] as V3, shoulderR: [0.2, 0.56, 0] as V3, elbowR: [0.28, 0.35, 0.1] as V3, handR: [0.19, 0.34, 0.35] as V3 };

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (chest.current) chest.current.scale.set(1, 1 + Math.sin(t * 1.6) * 0.012, 1 + Math.sin(t * 1.6) * 0.012);
    if (head.current) {
      head.current.rotation.x = (desk ? 0.12 : 0.3) + Math.sin(t * 0.7) * 0.025;
      head.current.rotation.y = Math.sin(t * 0.4) * (desk ? 0.05 : 0.09);
      if (headphones) head.current.rotation.z = Math.sin(t * 2.4) * 0.02; // 音楽に合わせて少しゆれる
    }
    if (tail.current) {
      tail.current.rotation.z = Math.sin(t * 2.1) * 0.1;
      tail.current.rotation.x = Math.sin(t * 1.7) * 0.05;
    }
    // まばたき
    if (eyes.current) eyes.current.scale.y = t % 4.2 > 4.08 ? 0.1 : 1;
    // タイピング（左右の手が交互に上下する）
    if (desk) {
      if (handL.current) handL.current.position.y = Math.max(0, Math.sin(t * 9)) * 0.012;
      if (handR.current) handR.current.position.y = Math.max(0, Math.sin(t * 9 + 2.2)) * 0.012;
    }
    if (page.current) {
      const ph = (t % 9) / 9;
      if (ph > 0.7 && ph < 0.8) {
        page.current.visible = true;
        page.current.rotation.z = Math.PI * easeInOut((ph - 0.7) / 0.1);
      } else page.current.visible = false;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={1.25}>
      {/* 住人や姿勢を切り替えたら影の設定をやり直すため key を付ける */}
      <ShadowGroup key={`${avatar}-${pose}-${headphones}`}>
        {desk ? <SeatedLegs look={look} /> : <CrossedLegs look={look} />}

        {/* 胴体（パーカー） */}
        <group ref={chest} position={[0, 0.1, 0]} rotation={[desk ? 0.05 : -0.1, 0, 0]}>
          <mesh geometry={geo.torso} position={[0, 0.27, 0]}>
            <Cloth color={look.top} />
          </mesh>
          <mesh geometry={geo.pocket} position={[0, 0.16, 0.135]} rotation={[0.08, 0, 0]}>
            <Cloth color={look.topDark} />
          </mesh>
          {/* すそのリブ */}
          <mesh position={[0, 0.06, 0]} scale={[1, 1, 0.68]}>
            <torusGeometry args={[0.175, 0.03, 10, 32]} />
            <Cloth color={look.topDark} />
          </mesh>
          {/* フードとひも */}
          <mesh geometry={geo.hood} position={[0, 0.5, -0.08]} rotation={[Math.PI / 2 + 0.35, 0, Math.PI * 0.375 + Math.PI / 2]}>
            <Cloth color={look.topDark} />
          </mesh>
          {[-0.045, 0.045].map((x) => (
            <group key={x}>
              <mesh position={[x, 0.42, 0.14]} rotation={[0.1, 0, 0]}>
                <cylinderGeometry args={[0.005, 0.005, 0.13, 6]} />
                <meshStandardMaterial color="#f4efe2" />
              </mesh>
              <mesh position={[x, 0.355, 0.146]}>
                <sphereGeometry args={[0.009, 8, 8]} />
                <meshStandardMaterial color="#f4efe2" />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.58, 0.01]}>
            <cylinderGeometry args={[0.052, 0.058, 0.1, 16]} />
            <Skin />
          </mesh>
        </group>

        {/* 腕（そで口つき）と手 */}
        <Limb a={arm.shoulderL} b={arm.elbowL} r={0.056} color={look.top} />
        <Limb a={arm.elbowL} b={arm.handL} r={0.05} color={look.top} />
        <Limb a={arm.shoulderR} b={arm.elbowR} r={0.056} color={look.top} />
        <Limb a={arm.elbowR} b={arm.handR} r={0.05} color={look.top} />
        <group ref={handL}>
          <Hand at={arm.handL} from={arm.elbowL} cuff={look.topDark} side={-1} />
        </group>
        <group ref={handR}>
          <Hand at={arm.handR} from={arm.elbowR} cuff={look.topDark} side={1} />
        </group>

        {/* 本（読書のときだけ） */}
        {!desk && (
          <group position={[0, 0.34, 0.36]} rotation={[-0.55, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.54, 0.02, 0.36]} />
              <meshStandardMaterial color={look.book} roughness={0.8} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.131, 0.02, 0]} rotation={[0, 0, -s * 0.06]}>
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
        )}

        {/* 頭 */}
        <group ref={head} position={[0, 0.83, 0.02]}>
          <Head avatar={avatar} hair={look.hair} tail={tail} eyes={eyes} />
          {headphones && <Headphones />}
        </group>
      </ShadowGroup>
    </group>
  );
}

/** 手（手のひら＋親指）とそで口 */
function Hand({ at, from, cuff, side }: { at: V3; from: V3; cuff: string; side: number }) {
  const q = useMemo(() => {
    const dir = new THREE.Vector3(...at).sub(new THREE.Vector3(...from)).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  }, [at, from]);
  return (
    <group position={at} quaternion={q}>
      <mesh position={[0, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.048, 0.014, 8, 20]} />
        <Cloth color={cuff} />
      </mesh>
      <mesh position={[0, -0.005, 0.02]} scale={[1, 0.62, 1.25]}>
        <sphereGeometry args={[0.045, 20, 16]} />
        <Skin />
      </mesh>
      <mesh position={[side * -0.04, 0.005, 0.015]} rotation={[0.3, 0, side * 0.9]}>
        <capsuleGeometry args={[0.013, 0.03, 4, 10]} />
        <Skin />
      </mesh>
    </group>
  );
}

/** あぐら（読書の姿勢）。ひざを左右に出し、足先を前で重ねる */
function CrossedLegs({ look }: { look: (typeof LOOKS)[Avatar] }) {
  return (
    <group>
      <mesh position={[0, 0.09, 0.15]} scale={[0.4, 0.12, 0.25]}>
        <sphereGeometry args={[1, 32, 20]} />
        <Cloth color={look.bottom} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.3, 0.1, 0.17]} scale={[1, 0.85, 1]}>
            <sphereGeometry args={[0.085, 20, 16]} />
            <Cloth color={look.bottom} />
          </mesh>
          <mesh position={[-s * 0.1, 0.075, 0.36]} rotation={[0, s * 0.5, 0]} scale={[0.75, 0.6, 1.3]}>
            <sphereGeometry args={[0.06, 16, 12]} />
            <Cloth color={look.shoes} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** イスに座った脚（太ももは前、すねは下） */
function SeatedLegs({ look }: { look: (typeof LOOKS)[Avatar] }) {
  return (
    <group>
      <mesh position={[0, 0.08, 0]} scale={[1.15, 0.6, 0.9]}>
        <sphereGeometry args={[0.16, 24, 16]} />
        <Cloth color={look.bottom} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Limb a={[s * 0.09, 0.07, 0]} b={[s * 0.1, 0.07, 0.34]} r={0.075} color={look.bottom} />
          <Limb a={[s * 0.1, 0.06, 0.36]} b={[s * 0.11, -0.3, 0.4]} r={0.06} color={look.bottom} />
          {/* スニーカー */}
          <mesh position={[s * 0.11, -0.37, 0.45]} scale={[0.8, 0.55, 1.4]}>
            <sphereGeometry args={[0.065, 20, 14]} />
            <meshStandardMaterial color={look.shoes} roughness={0.6} />
          </mesh>
          <mesh position={[s * 0.11, -0.395, 0.45]} scale={[0.85, 0.2, 1.45]}>
            <sphereGeometry args={[0.065, 20, 10]} />
            <meshStandardMaterial color="#d9d4ca" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 顔と髪 */
function Head({ avatar, hair, tail, eyes }: { avatar: Avatar; hair: string; tail: RefObject<THREE.Group | null>; eyes: RefObject<THREE.Group | null> }) {
  return (
    <group>
      {/* 頭（あごを少し細くする） */}
      <mesh scale={[1, 1.04, 0.98]}>
        <sphereGeometry args={[0.17, 40, 32]} />
        <Skin />
      </mesh>
      <mesh position={[0, -0.07, 0.03]} scale={[0.82, 0.6, 0.85]}>
        <sphereGeometry args={[0.14, 32, 24]} />
        <Skin />
      </mesh>
      {[-0.168, 0.168].map((x) => (
        <mesh key={x} position={[x, -0.01, 0]} scale={[0.6, 1, 0.9]}>
          <sphereGeometry args={[0.035, 14, 12]} />
          <Skin />
        </mesh>
      ))}

      {/* 目（白目・黒目・ハイライト）。まばたきでまとめて縦につぶす */}
      <group ref={eyes} position={[0, -0.012, 0]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.062, 0, 0.148]} rotation={[0, s * 0.32, 0]}>
            <mesh scale={[1, 1.25, 0.45]}>
              <sphereGeometry args={[0.026, 20, 16]} />
              <meshStandardMaterial color="#fffdf8" roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.002, 0.009]} scale={[1, 1.25, 0.5]}>
              <sphereGeometry args={[0.019, 20, 16]} />
              <meshStandardMaterial color="#3a2516" roughness={0.25} />
            </mesh>
            <mesh position={[0, -0.003, 0.016]} scale={[1, 1.2, 0.4]}>
              <sphereGeometry args={[0.01, 12, 10]} />
              <meshStandardMaterial color="#120a05" roughness={0.2} />
            </mesh>
            <mesh position={[0.007, 0.01, 0.021]}>
              <sphereGeometry args={[0.0055, 10, 8]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
      {/* まゆ毛 */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.062, 0.04, 0.155]} rotation={[0.2, s * 0.3, Math.PI / 2 + s * 0.12]}>
          <capsuleGeometry args={[0.0045, 0.03, 4, 8]} />
          <meshStandardMaterial color={hair} roughness={0.7} />
        </mesh>
      ))}
      {/* 鼻・口・ほっぺ */}
      <mesh position={[0, -0.04, 0.166]} scale={[1, 0.8, 0.8]}>
        <sphereGeometry args={[0.01, 12, 10]} />
        <Skin />
      </mesh>
      <mesh position={[0, -0.075, 0.152]} rotation={[0.15, 0, Math.PI]}>
        <torusGeometry args={[0.014, 0.003, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#b85a4e" roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.1, -0.055, 0.128]} rotation={[0, s * 0.6, 0]} scale={[1.3, 0.75, 0.35]}>
          <sphereGeometry args={[0.025, 14, 12]} />
          <meshStandardMaterial color="#f59a8c" transparent opacity={avatar === "girl" ? 0.55 : 0.35} roughness={0.8} />
        </mesh>
      ))}

      {avatar === "girl" ? <GirlHair color={hair} tail={tail} /> : <BoyHair color={hair} />}
    </group>
  );
}

/** 髪のマテリアル（ツヤを少し） */
function HairMat({ color }: { color: string }) {
  return <meshPhysicalMaterial color={color} roughness={0.5} clearcoat={0.3} clearcoatRoughness={0.5} sheen={0.5} sheenColor="#ffd9b0" />;
}

/** 髪の房（先が細くなる） */
function Strand({ position, rotation, length, radius, color }: { position: V3; rotation: V3; length: number; radius: number; color: string }) {
  return (
    <mesh position={position} rotation={rotation} scale={[1, 1, 0.75]}>
      <coneGeometry args={[radius, length, 14, 1]} />
      <HairMat color={color} />
    </mesh>
  );
}

/** 女の子：前髪の房＋肩までの髪＋ゆれるポニーテール */
function GirlHair({ color, tail }: { color: string; tail: RefObject<THREE.Group | null> }) {
  return (
    <>
      <mesh position={[0, 0.02, -0.02]} scale={[1.04, 1.04, 1.06]}>
        <sphereGeometry args={[0.172, 40, 32, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <HairMat color={color} />
      </mesh>
      <mesh position={[0, -0.02, -0.04]} scale={[1.06, 1.05, 1.0]}>
        <sphereGeometry args={[0.172, 40, 24, Math.PI * 0.62, Math.PI * 1.76, Math.PI * 0.3, Math.PI * 0.45]} />
        <HairMat color={color} />
      </mesh>
      {/* 前髪 */}
      {[-0.1, -0.05, 0.0, 0.05, 0.1].map((x, i) => (
        <Strand key={x} position={[x, 0.07 - Math.abs(x) * 0.25, 0.14 - Math.abs(x) * 0.25]} rotation={[Math.PI - 0.55, 0, x * 2.4]} length={0.11 + (i % 2) * 0.02} radius={0.035} color={color} />
      ))}
      {/* 横の髪 */}
      {[-1, 1].map((s) => (
        <Strand key={s} position={[s * 0.15, -0.06, 0.06]} rotation={[Math.PI - 0.1, 0, -s * 0.15]} length={0.2} radius={0.04} color={color} />
      ))}
      <group ref={tail} position={[0, 0.08, -0.17]}>
        <mesh position={[0, -0.06, -0.05]} rotation={[0.55, 0, 0]} scale={[1, 1, 0.8]}>
          <capsuleGeometry args={[0.055, 0.2, 8, 16]} />
          <HairMat color={color} />
        </mesh>
        <Strand position={[0, -0.22, -0.12]} rotation={[Math.PI + 0.55, 0, 0]} length={0.12} radius={0.05} color={color} />
        <mesh rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.042, 0.014, 10, 20]} />
          <meshStandardMaterial color="#e07a5f" roughness={0.5} />
        </mesh>
      </group>
    </>
  );
}

/** 男の子：短めの房を重ねた髪＋アホ毛 */
function BoyHair({ color }: { color: string }) {
  return (
    <>
      <mesh position={[0, 0.03, -0.02]} rotation={[-0.3, 0, 0]} scale={[1.04, 1.02, 1.05]}>
        <sphereGeometry args={[0.172, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <HairMat color={color} />
      </mesh>
      {/* 前髪とサイドの房 */}
      {[-0.09, -0.03, 0.03, 0.09].map((x, i) => (
        <Strand key={x} position={[x, 0.085 - (i % 2) * 0.012, 0.13]} rotation={[Math.PI - 0.7, 0, x * 2.2]} length={0.09} radius={0.04} color={color} />
      ))}
      {[-1, 1].map((s) => (
        <Strand key={s} position={[s * 0.155, 0.0, 0.05]} rotation={[Math.PI - 0.2, 0, -s * 0.25]} length={0.09} radius={0.035} color={color} />
      ))}
      {/* 後ろの房 */}
      {[-0.08, 0, 0.08].map((x) => (
        <Strand key={x} position={[x, -0.04, -0.14]} rotation={[Math.PI + 0.5, 0, x * 1.5]} length={0.1} radius={0.045} color={color} />
      ))}
      <mesh position={[0.02, 0.2, -0.02]} rotation={[-0.4, 0, -0.5]}>
        <coneGeometry args={[0.022, 0.09, 10]} />
        <HairMat color={color} />
      </mesh>
    </>
  );
}

/** ヘッドホン */
function Headphones() {
  return (
    <group position={[0, 0.02, -0.01]}>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.195, 0.016, 10, 40, Math.PI]} />
        <meshStandardMaterial color="#25282e" roughness={0.35} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.19, -0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.06, 0.045, 28]} />
            <meshStandardMaterial color="#25282e" roughness={0.35} />
          </mesh>
          <mesh position={[0, -s * 0.024, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.03, 0.006, 8, 24]} />
            <meshBasicMaterial color={new THREE.Color("#38d6c4").multiplyScalar(2)} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
