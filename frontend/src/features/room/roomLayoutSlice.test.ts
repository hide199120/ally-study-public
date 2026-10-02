import { makeStore } from '../../app/store'
import { moveFurniture, resetLayout, roomLayoutReducer, selectFurnitureOffset, selectHasMovedFurniture } from './roomLayoutSlice'

describe('roomLayoutSlice', () => {
  const initial = roomLayoutReducer(undefined, { type: '@@INIT' })

  it('初期状態では何も動かしていない', () => {
    expect(initial).toEqual({ offsets: {} })
  })

  it('moveFurniture で指定した家具の位置を記録する', () => {
    const state = roomLayoutReducer(initial, moveFurniture({ id: 'bed', offset: { x: -0.5, z: 0.3 } }))
    expect(state.offsets).toEqual({ bed: { x: -0.5, z: 0.3 } })
  })

  it('元の位置（0, 0）に戻したら記録を消す', () => {
    const moved = roomLayoutReducer(initial, moveFurniture({ id: 'chair', offset: { x: 1, z: 0 } }))
    const back = roomLayoutReducer(moved, moveFurniture({ id: 'chair', offset: { x: 0, z: 0 } }))
    expect(back.offsets).toEqual({})
  })

  it('resetLayout ですべての家具を初期配置に戻す', () => {
    let state = roomLayoutReducer(initial, moveFurniture({ id: 'bed', offset: { x: 1, z: 1 } }))
    state = roomLayoutReducer(state, moveFurniture({ id: 'desk', offset: { x: 0, z: 0.4 } }))
    expect(roomLayoutReducer(state, resetLayout())).toEqual({ offsets: {} })
  })

  describe('セレクター', () => {
    it('動かしていない家具は (0, 0) を返し、毎回同じオブジェクトになる', () => {
      const store = makeStore()
      const a = selectFurnitureOffset(store.getState(), 'rug')
      const b = selectFurnitureOffset(store.getState(), 'rug')
      expect(a).toEqual({ x: 0, z: 0 })
      expect(a).toBe(b)
    })

    it('動かした家具の位置と、動かしたかどうかを返す', () => {
      const store = makeStore()
      expect(selectHasMovedFurniture(store.getState())).toBe(false)
      store.dispatch(moveFurniture({ id: 'sideTable', offset: { x: -1, z: 0.5 } }))
      expect(selectFurnitureOffset(store.getState(), 'sideTable')).toEqual({ x: -1, z: 0.5 })
      expect(selectHasMovedFurniture(store.getState())).toBe(true)
    })
  })
})
