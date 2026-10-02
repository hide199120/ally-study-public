import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../app/store'
import type { Room } from '../../api/types'
import {
  DEFAULT_AVATAR,
  DEFAULT_WALLPAPER,
  FURNITURE,
  FURNITURE_IDS,
  isAvatar,
  isFurnitureId,
  isWallpaper,
  type Avatar,
  type FurnitureId,
  type Wallpaper,
} from './catalog'

export type { FurnitureId }

/** 初期配置からどれだけ動かしたか（床の上の x, z） */
export type Offset = { x: number; z: number }

/** 模様替えパネルのタブ */
export type LayoutTab = 'bag' | 'wallpaper' | 'avatar'

type RoomLayoutState = {
  offsets: Partial<Record<FurnitureId, Offset>>
  /** true=部屋に出している / false=バッグの中 */
  placed: Record<FurnitureId, boolean>
  wallpaper: Wallpaper
  avatar: Avatar
  /** 模様替えモード中か（このときだけ家具を動かしたり、出し入れしたりできる） */
  editing: boolean
  /** 模様替えモード中にクリックして選んでいる家具（「しまう」ボタンを出す） */
  selected: FurnitureId | null
  tab: LayoutTab
}

const defaultPlaced = (): Record<FurnitureId, boolean> =>
  Object.fromEntries(FURNITURE_IDS.map((id) => [id, FURNITURE[id].defaultPlaced])) as Record<FurnitureId, boolean>

const initialState: RoomLayoutState = {
  offsets: {},
  placed: defaultPlaced(),
  wallpaper: DEFAULT_WALLPAPER,
  avatar: DEFAULT_AVATAR,
  editing: false,
  selected: null,
  tab: 'bag',
}

/** 動かしていない家具は同じオブジェクトを返す（useSelector が毎回再描画しないように） */
const ZERO: Offset = { x: 0, z: 0 }

/** 部屋の模様替え（家具の配置・バッグ・壁紙・住人）を管理する */
const roomLayoutSlice = createSlice({
  name: 'roomLayout',
  initialState,
  reducers: {
    startEditing(state) {
      state.editing = true
    },
    finishEditing(state) {
      state.editing = false
      state.selected = null
    },
    setTab(state, action: PayloadAction<LayoutTab>) {
      state.tab = action.payload
    },
    moveFurniture(state, action: PayloadAction<{ id: FurnitureId; offset: Offset }>) {
      if (!state.editing) return
      const { id, offset } = action.payload
      if (!state.placed[id]) return
      if (offset.x === 0 && offset.z === 0) {
        delete state.offsets[id]
      } else {
        state.offsets[id] = offset
      }
    },
    /** 家具を選ぶ（null で選択解除） */
    selectFurniture(state, action: PayloadAction<FurnitureId | null>) {
      if (!state.editing) return
      const id = action.payload
      state.selected = id && state.placed[id] ? id : null
    },
    /** 部屋の家具をバッグにしまう。次に出したときは初期位置に戻る */
    storeFurniture(state, action: PayloadAction<FurnitureId>) {
      if (!state.editing) return
      const id = action.payload
      state.placed[id] = false
      delete state.offsets[id]
      if (state.selected === id) state.selected = null
    },
    /** バッグの家具を部屋に出す（初期位置に置く） */
    placeFurniture(state, action: PayloadAction<FurnitureId>) {
      if (!state.editing) return
      const id = action.payload
      state.placed[id] = true
      delete state.offsets[id]
      state.selected = id
    },
    setWallpaper(state, action: PayloadAction<Wallpaper>) {
      if (!state.editing) return
      state.wallpaper = action.payload
    },
    setAvatar(state, action: PayloadAction<Avatar>) {
      if (!state.editing) return
      state.avatar = action.payload
    },
    /** 家具をすべて初期配置（最初から置いてある家具だけ出ている状態）に戻す。壁紙と住人はそのまま */
    resetLayout(state) {
      if (!state.editing) return
      state.offsets = {}
      state.placed = defaultPlaced()
      state.selected = null
    },
    /** サーバーに保存されている部屋を読み込む。保存されていない家具は初期状態にする */
    loadRoom(state, action: PayloadAction<Room>) {
      const room = action.payload
      state.offsets = {}
      state.placed = defaultPlaced()
      for (const f of room.furniture) {
        if (!isFurnitureId(f.id)) continue
        state.placed[f.id] = f.placed
        if (f.placed && (f.x !== 0 || f.z !== 0)) state.offsets[f.id] = { x: f.x, z: f.z }
      }
      state.wallpaper = isWallpaper(room.wallpaper) ? room.wallpaper : DEFAULT_WALLPAPER
      state.avatar = isAvatar(room.avatar) ? room.avatar : DEFAULT_AVATAR
      state.selected = null
    },
    /** ログアウトしたときなどに、部屋をまるごと初期状態に戻す */
    resetRoom() {
      return initialState
    },
  },
})

export const {
  startEditing,
  finishEditing,
  setTab,
  moveFurniture,
  selectFurniture,
  storeFurniture,
  placeFurniture,
  setWallpaper,
  setAvatar,
  resetLayout,
  loadRoom,
  resetRoom,
} = roomLayoutSlice.actions
export const roomLayoutReducer = roomLayoutSlice.reducer

export const selectFurnitureOffset = (state: RootState, id: FurnitureId): Offset => state.roomLayout.offsets[id] ?? ZERO
export const selectIsPlaced = (state: RootState, id: FurnitureId): boolean => state.roomLayout.placed[id]
export const selectIsEditingLayout = (state: RootState): boolean => state.roomLayout.editing
export const selectSelectedFurniture = (state: RootState): FurnitureId | null => state.roomLayout.selected
export const selectWallpaper = (state: RootState): Wallpaper => state.roomLayout.wallpaper
export const selectAvatar = (state: RootState): Avatar => state.roomLayout.avatar
export const selectLayoutTab = (state: RootState): LayoutTab => state.roomLayout.tab

const selectPlaced = (state: RootState) => state.roomLayout.placed
const selectOffsets = (state: RootState) => state.roomLayout.offsets

/** バッグの中の家具 */
export const selectBagItems = createSelector([selectPlaced], (placed) => FURNITURE_IDS.filter((id) => !placed[id]))
/** 部屋に出ている家具 */
export const selectPlacedItems = createSelector([selectPlaced], (placed) => FURNITURE_IDS.filter((id) => placed[id]))

/** 家具を動かしたり出し入れしたりして、初期配置から変わっているか */
export const selectHasMovedFurniture = createSelector(
  [selectPlaced, selectOffsets],
  (placed, offsets) => Object.keys(offsets).length > 0 || FURNITURE_IDS.some((id) => placed[id] !== FURNITURE[id].defaultPlaced),
)

/** サーバーに保存する形（全部の家具の状態を入れる） */
export const selectRoomForSave = createSelector(
  [selectPlaced, selectOffsets, selectWallpaper, selectAvatar],
  (placed, offsets, wallpaper, avatar): Room => ({
    avatar,
    wallpaper,
    furniture: FURNITURE_IDS.map((id) => ({ id, placed: placed[id], x: offsets[id]?.x ?? 0, z: offsets[id]?.z ?? 0 })),
  }),
)
