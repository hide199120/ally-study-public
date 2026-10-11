import * as THREE from "three";

/* テーマ別の家具で共通して使うマテリアル */

/** 布（少しだけ光沢のある起毛） */
export function Fabric({ color, sheen = 0.6 }: { color: string; sheen?: number }) {
  return <meshPhysicalMaterial color={color} roughness={0.92} sheen={sheen} sheenRoughness={0.8} sheenColor="#ffffff" />;
}
/** 木（つや消しの塗装） */
export function Wood({ color = "#d8b28a", map }: { color?: string; map?: THREE.Texture }) {
  return <meshPhysicalMaterial color={color} map={map} roughness={0.55} clearcoat={0.25} clearcoatRoughness={0.6} />;
}
/** つや消しの樹脂・塗装 */
export function Matte({ color, roughness = 0.6, map }: { color: string; roughness?: number; map?: THREE.Texture }) {
  return <meshStandardMaterial color={color} roughness={roughness} map={map} />;
}
/** 金属 */
export function Metal({ color = "#b8bcc4", roughness = 0.3 }: { color?: string; roughness?: number }) {
  return <meshStandardMaterial color={color} metalness={0.9} roughness={roughness} />;
}
/** ガラス */
export function Glass({ color = "#cfe3ff", opacity = 0.25 }: { color?: string; opacity?: number }) {
  return <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.05} metalness={0} clearcoat={1} depthWrite={false} />;
}
/** 光る素材（ブルームで光がにじむ） */
export function Emissive({ color, strength = 2 }: { color: string; strength?: number }) {
  return <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(strength)} toneMapped={false} />;
}
