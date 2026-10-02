import { makeStore } from '../../app/store'
import {
  finishEditing,
  moveFurniture,
  resetLayout,
  roomLayoutReducer,
  selectFurnitureOffset,
  selectHasMovedFurniture,
  selectIsEditingLayout,
  startEditing,
} from './roomLayoutSlice'

describe('roomLayoutSlice', () => {
  const initial = roomLayoutReducer(undefined, { type: '@@INIT' })
  const editing = roomLayoutReducer(initial, startEditing())

  it('初期状態では何も動かしておらず、模様替えモードでもない', () => {
    expect(initial).toEqual({ offsets: {}, editing: false })
  })

  it('startEditing / finishEditing で模様替えモードを切り替える', () => {
    expect(editing.editing).toBe(true)
    expect(roomLayoutReducer(editing, finishEditing()).editing).toBe(false)
  })

  it('模様替えモードでなければ家具は動かせない', () => {
    const state = roomLayoutReducer(initial, moveFurniture({ id: 'bed', offset: { x: -0.5, z: 0.3 } }))
    expect(state.offsets).toEqual({})
  })

  it('moveFurniture で指定した家具の位置を記録する', () => {
    const state = roomLayoutReducer(editing, moveFurniture({ id: 'bed', offset: { x: -0.5, z: 0.3 } }))
    expect(state.offsets).toEqual({ bed: { x: -0.5, z: 0.3 } })
  })

  it('元の位置（0, 0）に戻したら記録を消す', () => {
    const moved = roomLayoutReducer(editing, moveFurniture({ id: 'chair', offset: { x: 1, z: 0 } }))
    const back = roomLayoutReducer(moved, moveFurniture({ id: 'chair', offset: { x: 0, z: 0 } }))
    expect(back.offsets).toEqual({})
  })

  it('模様替えモードを終えても、動かした配置は残る', () => {
    const moved = roomLayoutReducer(editing, moveFurniture({ id: 'desk', offset: { x: 0, z: 0.4 } }))
    expect(roomLayoutReducer(moved, finishEditing()).offsets).toEqual({ desk: { x: 0, z: 0.4 } })
  })

  it('resetLayout で模様替えモードのまま初期配置に戻す', () => {
    let state = roomLayoutReducer(editing, moveFurniture({ id: 'bed', offset: { x: 1, z: 1 } }))
    state = roomLayoutReducer(state, moveFurniture({ id: 'desk', offset: { x: 0, z: 0.4 } }))
    expect(roomLayoutReducer(state, resetLayout())).toEqual({ offsets: {}, editing: true })
  })

  it('模様替えモードでなければ resetLayout は何もしない', () => {
    const moved = roomLayoutReducer(editing, moveFurniture({ id: 'bed', offset: { x: 1, z: 1 } }))
    const done = roomLayoutReducer(moved, finishEditing())
    expect(roomLayoutReducer(done, resetLayout()).offsets).toEqual({ bed: { x: 1, z: 1 } })
  })

  describe('セレクター', () => {
    it('動かしていない家具は (0, 0) を返し、毎回同じオブジェクトになる', () => {
      const store = makeStore()
      const a = selectFurnitureOffset(store.getState(), 'rug')
      const b = selectFurnitureOffset(store.getState(), 'rug')
      expect(a).toEqual({ x: 0, z: 0 })
      expect(a).toBe(b)
    })

    it('動かした家具の位置、動かしたかどうか、模様替えモードかを返す', () => {
      const store = makeStore()
      expect(selectHasMovedFurniture(store.getState())).toBe(false)
      expect(selectIsEditingLayout(store.getState())).toBe(false)
      store.dispatch(startEditing())
      store.dispatch(moveFurniture({ id: 'sideTable', offset: { x: -1, z: 0.5 } }))
      expect(selectFurnitureOffset(store.getState(), 'sideTable')).toEqual({ x: -1, z: 0.5 })
      expect(selectHasMovedFurniture(store.getState())).toBe(true)
      expect(selectIsEditingLayout(store.getState())).toBe(true)
    })
  })
})
