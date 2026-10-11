/* 部屋の雰囲気（テーマ）。選ぶと 3D の部屋・窓の外・画面全体の色がまとめて切り替わる */

export type ThemeId = 'forest' | 'hideout' | 'rain' | 'countryside' | 'city'

/** 窓の外の景色の種類 */
export type OutsideKind = 'forest' | 'night' | 'rain' | 'sunset' | 'city'
/** 部屋の中をただよう光の粒 */
export type ParticleKind = 'fireflies' | 'dust' | 'none'

/** 家具のセット（テーマごとに見た目が変わる） */
export type FurnitureSet = 'natural' | 'hideout' | 'rain' | 'countryside' | 'city'

/** 壁などを色で染める面の照明（RectAreaLight） */
export type Wash = { color: string; intensity: number; position: [number, number, number]; lookAt: [number, number, number]; size: [number, number] }

/** 3D の部屋の光と色 */
export type SceneLook = {
  furniture: FurnitureSet
  /** 色の照明（モニターやLEDの光が壁に当たっている感じ） */
  washes: Wash[]
  /** 周りの環境光（反射やふんわりした明るさ）の強さ */
  envIntensity: number
  /** すみの陰り（アンビエントオクルージョン）の強さ */
  ao: number
  /** 空からの光（上の色・下の色・強さ） */
  hemi: [string, string, number]
  /** 窓から差し込む光 */
  sun: { color: string; intensity: number; position: [number, number, number] }
  /** 部屋の中の暖かい明かり（ランプなど） */
  lamp: { color: string; intensity: number }
  /** 画面全体の明るさ（トーンマッピングの露出） */
  exposure: number
  /** 光のにじみ（ブルーム）の強さ */
  bloom: number
  /** 豆電球の色 */
  bulb: string
  particles: ParticleKind
  particleColor: string
  outside: OutsideKind
  /** 窓の外の空（上→下） */
  sky: [string, string, string]
  /** 壁の色（壁紙の上から掛ける色）。null なら壁紙のまま */
  wallTint: string | null
  /** 床の色合い */
  floorTint: string
  /** 窓の外の明かり（太陽・月）の色 */
  orb: string
}

/** 画面（ウィジェット）の色。CSS 変数として :root に入れる */
export type UiLook = {
  /** 文字の色（"R G B" の形。透明度は CSS 側で付ける） */
  ink: string
  /** パネルの地の色 */
  surface: string
  /** 入力欄などの不透明な地の色 */
  surfaceSolid: string
  /** パネルの不透明度 */
  surfaceAlpha: number
  accent: string
  accentDeep: string
  /** アクセント色の上に乗せる文字 */
  onAccent: string
  shadow: string
  /** ページの背景 */
  pageBg: string
  /** 背景の光の玉 */
  blobs: [string, string, string]
  /** 部屋のタイルの背景 */
  stageBg: string
  /** 光る文字（タイマーなど）のにじみ */
  glow: string
  colorScheme: 'light' | 'dark'
}

export type Theme = {
  id: ThemeId
  name: string
  /** ひとこと説明 */
  caption: string
  ui: UiLook
  scene: SceneLook
}

export const THEMES: Record<ThemeId, Theme> = {
  forest: {
    id: 'forest',
    name: '森の木漏れ日',
    caption: '午後の光が差し込む、緑の部屋',
    ui: {
      ink: '38 58 36',
      surface: '255 253 244',
      surfaceSolid: '#fffdf4',
      surfaceAlpha: 0.62,
      accent: '79 145 72',
      accentDeep: '47 98 44',
      onAccent: '#fffbea',
      shadow: '40 70 34',
      pageBg: 'linear-gradient(160deg, #e8f2d6 0%, #cfe3b2 50%, #b9d699 100%)',
      blobs: ['#f9f0b0', '#9fcf83', '#ffd892'],
      stageBg: 'radial-gradient(120% 90% at 60% 30%, #fff3c4 0%, #d6eab4 45%, #9cc77f 100%)',
      glow: 'rgb(255 236 160 / 0.55)',
      colorScheme: 'light',
    },
    scene: {
      furniture: 'natural',
      washes: [],
      envIntensity: 0.35,
      ao: 1.6,
      hemi: ['#f4f7dc', '#7d5d3c', 0.75],
      sun: { color: '#ffd98a', intensity: 3.6, position: [3.5, 5.5, -9] },
      lamp: { color: '#ffb35c', intensity: 3 },
      exposure: 1.05,
      bloom: 0.9,
      bulb: '#ffd27a',
      particles: 'fireflies',
      particleColor: '#fff3a0',
      outside: 'forest',
      sky: ['#fff6b8', '#d4ea9c', '#7fbf6c'],
      wallTint: null,
      floorTint: '#ffffff',
      orb: '#fffbd8',
    },
  },
  hideout: {
    id: 'hideout',
    name: '秘密基地',
    caption: '夜ふけの屋根裏。モニターとネオンだけが光る',
    ui: {
      ink: '226 236 240',
      surface: '20 26 36',
      surfaceSolid: '#111722',
      surfaceAlpha: 0.78,
      accent: '56 214 196',
      accentDeep: '22 160 148',
      onAccent: '#04201d',
      shadow: '0 0 0',
      pageBg: 'radial-gradient(120% 100% at 50% 0%, #1a2433 0%, #0b0f17 70%)',
      blobs: ['#1d6f73', '#5a2a7a', '#a8661c'],
      stageBg: 'radial-gradient(110% 90% at 50% 30%, #1d2b3d 0%, #0d121b 70%)',
      glow: 'rgb(56 214 196 / 0.6)',
      colorScheme: 'dark',
    },
    scene: {
      furniture: 'hideout',
      washes: [
        { color: '#3a6bff', intensity: 9, position: [-2.4, 1.5, -1.2], lookAt: [-3, 1.6, -1.2], size: [2.4, 1.6] },
        { color: '#ff2f86', intensity: 6, position: [2.3, 1.7, -2.3], lookAt: [2.3, 1.7, -3], size: [1.6, 2.4] },
        { color: '#ff2f86', intensity: 3, position: [2.9, 0.8, 0.2], lookAt: [0, 0.4, 0.2], size: [2.5, 1.2] },
      ],
      envIntensity: 0.25,
      ao: 2,
      hemi: ['#3b4c7a', '#120d0a', 0.35],
      sun: { color: '#8fb4ff', intensity: 0.9, position: [3.5, 6, -9] },
      lamp: { color: '#ff9a3c', intensity: 6 },
      exposure: 1.0,
      bloom: 1.6,
      bulb: '#ffb347',
      particles: 'dust',
      particleColor: '#7ff5e6',
      outside: 'night',
      sky: ['#05070f', '#111a33', '#25305a'],
      wallTint: '#4a5266',
      floorTint: '#b89a7c',
      orb: '#e8f0ff',
    },
  },
  rain: {
    id: 'rain',
    name: '雨の夜',
    caption: '窓をたたく雨と、デスクライトのあたたかさ',
    ui: {
      ink: '226 232 242',
      surface: '34 44 60',
      surfaceSolid: '#1d2533',
      surfaceAlpha: 0.7,
      accent: '246 193 119',
      accentDeep: '222 156 72',
      onAccent: '#2a1a05',
      shadow: '4 8 16',
      pageBg: 'linear-gradient(170deg, #2b3a4f 0%, #1a2433 55%, #10161f 100%)',
      blobs: ['#4b6a8f', '#2e4766', '#c98a3c'],
      stageBg: 'radial-gradient(110% 90% at 50% 30%, #34465e 0%, #18212e 75%)',
      glow: 'rgb(246 193 119 / 0.55)',
      colorScheme: 'dark',
    },
    scene: {
      furniture: 'rain',
      washes: [],
      envIntensity: 0.2,
      ao: 1.8,
      hemi: ['#6f86a8', '#1b1712', 0.55],
      sun: { color: '#9db4d6', intensity: 0.8, position: [3.5, 6, -9] },
      lamp: { color: '#ffae5a', intensity: 7 },
      exposure: 1.05,
      bloom: 1.3,
      bulb: '#ffc36e',
      particles: 'none',
      particleColor: '#ffffff',
      outside: 'rain',
      sky: ['#1b2536', '#2c3d56', '#3f5470'],
      wallTint: '#8a9bb0',
      floorTint: '#a69686',
      orb: '#cfd9ea',
    },
  },
  countryside: {
    id: 'countryside',
    name: '田舎の夕暮れ',
    caption: '田んぼの向こうに沈む夕日。オレンジに染まる部屋',
    ui: {
      ink: '74 44 28',
      surface: '255 246 232',
      surfaceSolid: '#fff6e8',
      surfaceAlpha: 0.66,
      accent: '222 108 64',
      accentDeep: '176 74 38',
      onAccent: '#fff7ec',
      shadow: '96 44 20',
      pageBg: 'linear-gradient(170deg, #ffd9a8 0%, #f7a97a 45%, #c97b6d 100%)',
      blobs: ['#ffe39a', '#ff9f73', '#d96f7c'],
      stageBg: 'radial-gradient(110% 90% at 60% 25%, #ffe7a8 0%, #f6a274 45%, #a8616a 100%)',
      glow: 'rgb(255 170 90 / 0.6)',
      colorScheme: 'light',
    },
    scene: {
      furniture: 'countryside',
      washes: [],
      envIntensity: 0.35,
      ao: 1.6,
      hemi: ['#ffcf9e', '#5a3420', 0.6],
      sun: { color: '#ff9a4d', intensity: 4.8, position: [6, 2.8, -9] },
      lamp: { color: '#ffb066', intensity: 2.5 },
      exposure: 1.05,
      bloom: 1.1,
      bulb: '#ffcf86',
      particles: 'dust',
      particleColor: '#ffd9a0',
      outside: 'sunset',
      sky: ['#5b4a8a', '#f0846a', '#ffd38a'],
      wallTint: '#f2d2b0',
      floorTint: '#ffe2c8',
      orb: '#ffe6a6',
    },
  },
  city: {
    id: 'city',
    name: '都会の夜',
    caption: '高層階から見下ろす夜景。ネオンのむらさき',
    ui: {
      ink: '240 236 250',
      surface: '26 20 40',
      surfaceSolid: '#151024',
      surfaceAlpha: 0.72,
      accent: '196 132 252',
      accentDeep: '150 88 230',
      onAccent: '#1a0b2e',
      shadow: '0 0 0',
      pageBg: 'linear-gradient(160deg, #2a1d4a 0%, #15112a 55%, #0a0814 100%)',
      blobs: ['#7c3aed', '#db2777', '#2563eb'],
      stageBg: 'radial-gradient(110% 90% at 50% 25%, #3a2860 0%, #120d22 75%)',
      glow: 'rgb(196 132 252 / 0.6)',
      colorScheme: 'dark',
    },
    scene: {
      furniture: 'city',
      washes: [{ color: '#b56cff', intensity: 4, position: [1.3, 1.8, -2.5], lookAt: [1.3, 1.0, 0], size: [2, 2] }],
      envIntensity: 0.2,
      ao: 1.8,
      hemi: ['#6a5bd6', '#140d1e', 0.45],
      sun: { color: '#b38cff', intensity: 1.2, position: [3.5, 4, -9] },
      lamp: { color: '#ff7ad1', intensity: 5 },
      exposure: 1.0,
      bloom: 1.5,
      bulb: '#ff9be0',
      particles: 'none',
      particleColor: '#ffffff',
      outside: 'city',
      sky: ['#0a0718', '#261a4e', '#5b2a6e'],
      wallTint: '#6e6a80',
      floorTint: '#9a92a8',
      orb: '#f3e9ff',
    },
  },
}

export const THEME_IDS = Object.keys(THEMES) as ThemeId[]
export const DEFAULT_THEME: ThemeId = 'forest'

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && v in THEMES
}

/** UI の色を CSS 変数にする */
export function themeCssVars(ui: UiLook): Record<string, string> {
  return {
    '--ink-rgb': ui.ink,
    '--surface-rgb': ui.surface,
    '--surface-solid': ui.surfaceSolid,
    '--surface-alpha': String(ui.surfaceAlpha),
    '--accent-rgb': ui.accent,
    '--accent-deep-rgb': ui.accentDeep,
    '--on-accent': ui.onAccent,
    '--shadow-rgb': ui.shadow,
    '--page-bg': ui.pageBg,
    '--blob-a': ui.blobs[0],
    '--blob-b': ui.blobs[1],
    '--blob-c': ui.blobs[2],
    '--stage-bg': ui.stageBg,
    '--glow': ui.glow,
  }
}
