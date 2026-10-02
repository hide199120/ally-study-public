import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../app/store'

/** 動かせる家具（大きめのものだけ） */
export const FURNITURE_IDS = ['bed', 'desk', 'chair', 'sideTable', 'rug', 'plantRight', 'plantLeft'] as const
export type FurnitureId = (typeof FURNITURE_IDS)[number]

/** 初期配置からどれだけ動かしたか（床の上の x, z） */
export type Offset = { x: number; z: number }

type RoomLayoutState = {
  offsets: Partial<Record<FurnitureId, Offset>>
}

const initialState: RoomLayoutState = { offsets: {} }

/** 動かしていない家具は同じオブジェクトを返す（useSelector が毎回再描画しないように） */
const ZERO: Offset = { x: 0, z: 0 }

/** 部屋の家具の配置を管理する */
const roomLayoutSlice = createSlice({
  name: 'roomLayout',
  initialState,
  reducers: {
    moveFurniture(state, action: PayloadAction<{ id: FurnitureId; offset: Offset }>) {
      const { id, offset } = action.payload
      if (offset.x === 0 && offset.z === 0) {
        delete state.offsets[id]
      } else {
        state.offsets[id] = offset
      }
    },
    resetLayout() {
      return initialState
    },
  },
})

export const { moveFurniture, resetLayout } = roomLayoutSlice.actions
export const roomLayoutReducer = roomLayoutSlice.reducer

export const selectFurnitureOffset = (state: RootState, id: FurnitureId): Offset => state.roomLayout.offsets[id] ?? ZERO
export const selectHasMovedFurniture = (state: RootState): boolean => Object.keys(state.roomLayout.offsets).length > 0
