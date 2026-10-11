import * as THREE from "three";

/* なめらかな形を作るための形状（ジオメトリ）の関数 */

type SoftBoxOptions = {
  /** 角の丸み（m）。幅・高さ・奥行きの半分より小さくする */
  radius?: number;
  /** 表面のしわ・ふくらみの大きさ（m）。0 ならまっすぐ */
  wrinkle?: number;
  /** 上面だけ少しふくらませる量（m）。クッションや布団用 */
  puff?: number;
  /** 1m あたりの分割数（多いほどなめらか） */
  density?: number;
  /** しわの模様を変えるための数 */
  seed?: number;
};

/**
 * 角が丸く、表面にゆるいしわ・ふくらみのある箱。
 * クッション・マットレス・布団・ソファの座面など、布っぽいものに使う。
 * 細かく分割した箱の各頂点を「内側の箱」から radius だけ外へ押し出して丸め、
 * そのあと法線方向に少しずらしてしわを付ける
 */
export function softBox(w: number, h: number, d: number, opts: SoftBoxOptions = {}) {
  const { radius = Math.min(w, h, d) * 0.25, wrinkle = 0, puff = 0, density = 28, seed = 1 } = opts;
  const r = Math.min(radius, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  const seg = (v: number) => Math.max(4, Math.round(v * density));
  const geo = new THREE.BoxGeometry(w, h, d, seg(w), seg(h), seg(d));
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const hd = d / 2 - r;
  const p = new THREE.Vector3();
  const inner = new THREE.Vector3();
  const n = new THREE.Vector3();
  const s1 = seed * 1.37;
  const s2 = seed * 2.11;
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    inner.set(THREE.MathUtils.clamp(p.x, -hw, hw), THREE.MathUtils.clamp(p.y, -hh, hh), THREE.MathUtils.clamp(p.z, -hd, hd));
    n.copy(p).sub(inner);
    if (n.lengthSq() < 1e-12) n.set(0, 1, 0);
    n.normalize();
    p.copy(inner).addScaledVector(n, r);
    // 上面ほど大きく、側面は少しだけ（中央が持ち上がる）
    const top = Math.max(0, n.y);
    if (puff > 0) {
      const fx = 1 - Math.pow(Math.abs(p.x) / (w / 2), 2);
      const fz = 1 - Math.pow(Math.abs(p.z) / (d / 2), 2);
      p.y += puff * Math.max(0, fx) * Math.max(0, fz) * (0.4 + 0.6 * top);
    }
    if (wrinkle > 0) {
      const k =
        Math.sin(p.x * 7.3 + s1) * Math.cos(p.z * 6.1 + s2) * 0.6 +
        Math.sin((p.x + p.z) * 13.7 + s2) * 0.25 +
        Math.cos(p.x * 3.1 - p.z * 4.7 + s1) * 0.4;
      p.addScaledVector(n, k * wrinkle * (0.35 + 0.65 * top));
    }
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * 2D の輪郭をなめらかな面取り付きで押し出した形（天板・ギターの胴など）
 */
export function beveledShape(shape: THREE.Shape, depth: number, bevel = 0.015) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 32,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

/** 角の丸い長方形の輪郭 */
export function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** 角の丸い板（天板など）。上を向いた状態（厚みは y 方向） */
export function roundedSlab(w: number, d: number, t: number, r = 0.04, bevel = 0.012) {
  const geo = beveledShape(roundedRectShape(w - bevel * 2, d - bevel * 2, Math.max(0.001, r - bevel)), t - bevel * 2, bevel);
  geo.rotateX(-Math.PI / 2);
  return geo;
}
