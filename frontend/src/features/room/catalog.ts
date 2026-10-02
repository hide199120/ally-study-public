import type { Avatar, FurnitureId, Wallpaper } from '../../api/types'

export type { Avatar, FurnitureId, Wallpaper }

type FurnitureInfo = {
  name: string
  icon: string
  /** 最初から部屋に置いてあるか（false なら最初はバッグの中） */
  defaultPlaced: boolean
}

/**
 * 動かせる家具の一覧（バッグに出し入れできる）。
 * 種類は OpenAPI の FurnitureId と同じ。Record にしているので、API に家具を足したらここも足さないと型エラーになる
 */
export const FURNITURE: Record<FurnitureId, FurnitureInfo> = {
  bed: { name: 'ベッド', icon: '🛏️', defaultPlaced: true },
  desk: { name: 'デスク', icon: '🖥️', defaultPlaced: true },
  chair: { name: 'チェア', icon: '🪑', defaultPlaced: true },
  sideTable: { name: 'ランプ台', icon: '🗄️', defaultPlaced: true },
  rug: { name: 'まるいラグ', icon: '🟢', defaultPlaced: true },
  plantRight: { name: '大きな観葉植物', icon: '🪴', defaultPlaced: true },
  plantLeft: { name: '観葉植物', icon: '🌿', defaultPlaced: true },
  cat: { name: 'ねこ', icon: '🐈', defaultPlaced: true },
  backpack: { name: 'リュック', icon: '🎒', defaultPlaced: true },
  bookshelf: { name: '本棚', icon: '📚', defaultPlaced: false },
  sofa: { name: 'ミニソファ', icon: '🛋️', defaultPlaced: false },
  beanbag: { name: 'ビーズクッション', icon: '🟡', defaultPlaced: false },
  lowTable: { name: 'ローテーブル', icon: '☕', defaultPlaced: false },
  floorLamp: { name: 'フロアランプ', icon: '💡', defaultPlaced: false },
  guitar: { name: 'ギター', icon: '🎸', defaultPlaced: false },
  fishbowl: { name: '金魚鉢', icon: '🐠', defaultPlaced: false },
  cactus: { name: 'サボテン', icon: '🌵', defaultPlaced: false },
}

/** 表示順（FURNITURE に書いた順） */
export const FURNITURE_IDS = Object.keys(FURNITURE) as FurnitureId[]

type WallpaperInfo = {
  name: string
  /** パネルの見本に使う CSS の背景 */
  swatch: string
}

export const WALLPAPERS: Record<Wallpaper, WallpaperInfo> = {
  meadow: { name: '若草', swatch: '#9bc878' },
  cream: { name: 'クリームストライプ', swatch: 'repeating-linear-gradient(90deg, #f6edd5 0 8px, #ecdcb4 8px 12px)' },
  dots: { name: 'さくら水玉', swatch: 'radial-gradient(circle, #fff 2.5px, transparent 3px) 0 0 / 12px 12px, #f6d3d4' },
  botanical: { name: 'ボタニカル', swatch: 'radial-gradient(ellipse 3px 6px, #7ea36f 80%, transparent) 0 0 / 14px 14px, #dce8cf' },
  gingham: {
    name: 'ギンガムチェック',
    swatch:
      'linear-gradient(90deg, rgba(120,170,205,.45) 50%, transparent 50%) 0 0 / 14px 14px, linear-gradient(rgba(120,170,205,.45) 50%, transparent 50%) 0 0 / 14px 14px, #fdf8ea',
  },
  night: { name: '星空', swatch: 'radial-gradient(circle, #fff3b0 1px, transparent 1.5px) 0 0 / 11px 13px, #2f3d63' },
  wood: { name: '板張り', swatch: 'repeating-linear-gradient(90deg, #c99862 0 10px, #b9844f 10px 11px, #d4a46d 11px 21px, #b9844f 21px 22px)' },
}

export const WALLPAPER_IDS = Object.keys(WALLPAPERS) as Wallpaper[]

export const AVATARS: Record<Avatar, { name: string; icon: string }> = {
  girl: { name: '女の子', icon: '👧' },
  boy: { name: '男の子', icon: '👦' },
}

export const AVATAR_IDS = Object.keys(AVATARS) as Avatar[]

export const DEFAULT_WALLPAPER: Wallpaper = 'meadow'
export const DEFAULT_AVATAR: Avatar = 'girl'

export const isFurnitureId = (v: string): v is FurnitureId => Object.hasOwn(FURNITURE, v)
export const isWallpaper = (v: string): v is Wallpaper => Object.hasOwn(WALLPAPERS, v)
export const isAvatar = (v: string): v is Avatar => Object.hasOwn(AVATARS, v)
