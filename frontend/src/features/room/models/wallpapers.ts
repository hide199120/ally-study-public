import * as THREE from "three";
import type { Wallpaper } from "../catalog";
import { makeTexture } from "./utils";

/**
 * 壁紙の見た目。
 * 壁（ExtrudeGeometry）の UV は壁の座標そのまま（1 = 1m）なので、テクスチャ1枚が壁の 1m 四方に貼られる
 */
type WallpaperLook = {
  /** 模様を描く（null なら単色） */
  draw: ((g: CanvasRenderingContext2D, s: number) => void) | null
  /** 単色のときの壁の色 */
  color: string
  /** 腰壁の色 */
  wainscot: string
  /** 腰壁の上の見切り材の色 */
  rail: string
}

const SIZE = 256;

const LOOKS: Record<Wallpaper, WallpaperLook> = {
  meadow: { draw: null, color: "#9bc878", wainscot: "#efe4c6", rail: "#d6b27a" },
  cream: {
    color: "#f6edd5",
    wainscot: "#c9a77c",
    rail: "#a97f50",
    draw: (g, s) => {
      g.fillStyle = "#f6edd5";
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 4; i++) {
        const x = (i * s) / 4;
        g.fillStyle = "#ead9b0";
        g.fillRect(x, 0, s / 10, s);
        g.fillStyle = "rgba(201,150,90,0.35)";
        g.fillRect(x + s / 10 + 6, 0, 3, s);
      }
    },
  },
  dots: {
    color: "#f6d3d4",
    wainscot: "#fbf3ea",
    rail: "#e6a9a6",
    draw: (g, s) => {
      g.fillStyle = "#f6d3d4";
      g.fillRect(0, 0, s, s);
      g.fillStyle = "#fffaf6";
      const n = 4;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const ox = y % 2 ? s / n / 2 : 0;
          g.beginPath();
          g.arc(x * (s / n) + ox + s / n / 4, y * (s / n) + s / n / 2, 9, 0, Math.PI * 2);
          g.fill();
        }
      }
    },
  },
  botanical: {
    color: "#dce8cf",
    wainscot: "#f3ecd8",
    rail: "#9db58a",
    draw: (g, s) => {
      g.fillStyle = "#dce8cf";
      g.fillRect(0, 0, s, s);
      // 葉っぱ（はみ出しても繋がるように、上下左右にずらして同じものを描く）
      const leaf = (x: number, y: number, a: number, c: string) => {
        for (const dx of [-s, 0, s]) {
          for (const dy of [-s, 0, s]) {
            g.save();
            g.translate(x + dx, y + dy);
            g.rotate(a);
            g.fillStyle = c;
            g.beginPath();
            g.ellipse(0, 0, 10, 26, 0, 0, Math.PI * 2);
            g.fill();
            g.strokeStyle = "rgba(255,255,255,0.45)";
            g.lineWidth = 1.5;
            g.beginPath();
            g.moveTo(0, -22);
            g.lineTo(0, 22);
            g.stroke();
            g.restore();
          }
        }
      };
      leaf(40, 50, 0.6, "#8fb07d");
      leaf(150, 30, -0.4, "#a6c193");
      leaf(210, 140, 0.9, "#7ea36f");
      leaf(90, 170, -0.7, "#a6c193");
      leaf(30, 230, 0.2, "#7ea36f");
      leaf(180, 230, -1.1, "#8fb07d");
    },
  },
  gingham: {
    color: "#fdf8ea",
    wainscot: "#ffffff",
    rail: "#8db7d3",
    draw: (g, s) => {
      g.fillStyle = "#fdf8ea";
      g.fillRect(0, 0, s, s);
      const n = 6;
      const w = s / n;
      g.fillStyle = "rgba(120,170,205,0.3)";
      for (let i = 0; i < n; i += 2) {
        g.fillRect(i * w, 0, w, s);
        g.fillRect(0, i * w, s, w);
      }
    },
  },
  night: {
    color: "#2f3d63",
    wainscot: "#d9cfb6",
    rail: "#a88d5c",
    draw: (g, s) => {
      g.fillStyle = "#2f3d63";
      g.fillRect(0, 0, s, s);
      // 星（毎回同じ並びになるように、乱数ではなく決まった計算で置く）
      for (let i = 0; i < 26; i++) {
        const x = (i * 97) % s;
        const y = (i * 61 + (i % 3) * 37) % s;
        const r = 1 + (i % 4) * 0.6;
        g.fillStyle = i % 5 === 0 ? "#fff3b0" : "rgba(255,255,255,0.85)";
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      // きらっとした星
      g.fillStyle = "#ffe9a0";
      for (const [x, y] of [
        [60, 70],
        [190, 180],
      ]) {
        g.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          const r = k % 2 ? 2.5 : 9;
          g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        g.fill();
      }
    },
  },
  wood: {
    color: "#c99862",
    wainscot: "#8f5f35",
    rail: "#6e4526",
    draw: (g, s) => {
      const planks = 5;
      const w = s / planks;
      for (let i = 0; i < planks; i++) {
        g.fillStyle = `hsl(30, 44%, ${54 + ((i * 7) % 4) * 3}%)`;
        g.fillRect(i * w, 0, w, s);
        g.fillStyle = "rgba(80,45,20,0.45)";
        g.fillRect(i * w, 0, 2, s);
        g.strokeStyle = "rgba(110,65,30,0.16)";
        for (let k = 0; k < 4; k++) {
          const x = i * w + 8 + k * 11;
          g.beginPath();
          g.moveTo(x, 0);
          g.bezierCurveTo(x + 4, s * 0.3, x - 4, s * 0.6, x + 2, s);
          g.stroke();
        }
      }
    },
  },
};

export type WallpaperMaterial = { map: THREE.Texture | null; color: string; wainscot: string; rail: string };

const cache = new Map<Wallpaper, WallpaperMaterial>();

/** 壁紙のテクスチャと色を返す（一度作ったテクスチャは使い回す） */
export function getWallpaper(id: Wallpaper): WallpaperMaterial {
  const hit = cache.get(id);
  if (hit) return hit;
  const look = LOOKS[id];
  let map: THREE.Texture | null = null;
  if (look.draw) {
    const draw = look.draw;
    map = makeTexture(SIZE, SIZE, (g, w) => draw(g, w));
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
  }
  const result = { map, color: look.draw ? "#ffffff" : look.color, wainscot: look.wainscot, rail: look.rail };
  cache.set(id, result);
  return result;
}
