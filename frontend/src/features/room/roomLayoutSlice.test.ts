import { makeStore } from '../../app/store'
import type { Room } from '../../api/types'
import { FURNITURE_IDS } from './catalog'
import {
  finishEditing,
  loadRoom,
  moveFurniture,
  placeFurniture,
  resetLayout,
  resetRoom,
  roomLayoutReducer,
  selectBagItems,
  selectFurniture,
  selectFurnitureOffset,
  selectHasMovedFurniture,
  selectIsEditingLayout,
  selectPlacedItems,
  selectRoomForSave,
  setAvatar,
  setTab,
  setWallpaper,
  startEditing,
  storeFurniture,
} from './roomLayoutSlice'

describe('roomLayoutSlice', () => {
  const initial = roomLayoutReducer(undefined, { type: '@@INIT' })
  const editing = roomLayoutReducer(initial, startEditing())

  it('初期状態では何も動かしておらず、最初からある家具だけ部屋に出ていて、模様替えモードでもない', () => {
    expect(initial.offsets).toEqual({})
    expect(initial.editing).toBe(false)
    expect(initial.wallpaper).toBe('meadow')
    expect(initial.avatar).toBe('girl')
    expect(initial.placed.bed).toBe(true)
    expect(initial.placed.cat).toBe(true)
    expect(initial.placed.sofa).toBe(false)
    expect(initial.placed.guitar).toBe(false)
  })

  it('startEditing / finishEditing で模様替えモードを切り替え、終わると選択も外れる', () => {
    expect(editing.editing).toBe(true)
    const selected = roomLayoutReducer(editing, selectFurniture('desk'))
    expect(selected.selected).toBe('desk')
    const done = roomLayoutReducer(selected, finishEditing())
    expect(done.editing).toBe(false)
    expect(done.selected).toBeNull()
  })

  it('模様替えモードでなければ、家具を動かしたり出し入れしたり、壁紙や住人を変えたりできない', () => {
    let state = roomLayoutReducer(initial, moveFurniture({ id: 'bed', offset: { x: -0.5, z: 0.3 } }))
    state = roomLayoutReducer(state, storeFurniture('bed'))
    state = roomLayoutReducer(state, placeFurniture('sofa'))
    state = roomLayoutReducer(state, setWallpaper('night'))
    state = roomLayoutReducer(state, setAvatar('boy'))
    state = roomLayoutReducer(state, selectFurniture('bed'))
    expect(state).toEqual(initial)
  })

  it('moveFurniture で指定した家具の位置を記録し、(0, 0) に戻したら記録を消す', () => {
    const moved = roomLayoutReducer(editing, moveFurniture({ id: 'bed', offset: { x: -0.5, z: 0.3 } }))
    expect(moved.offsets).toEqual({ bed: { x: -0.5, z: 0.3 } })
    const back = roomLayoutReducer(moved, moveFurniture({ id: 'bed', offset: { x: 0, z: 0 } }))
    expect(back.offsets).toEqual({})
  })

  it('バッグの中の家具は動かせない', () => {
    const state = roomLayoutReducer(editing, moveFurniture({ id: 'sofa', offset: { x: 1, z: 0 } }))
    expect(state.offsets).toEqual({})
  })

  it('storeFurniture で家具をバッグにしまうと、位置と選択もリセットされる', () => {
    let state = roomLayoutReducer(editing, moveFurniture({ id: 'desk', offset: { x: 0, z: 0.4 } }))
    state = roomLayoutReducer(state, selectFurniture('desk'))
    state = roomLayoutReducer(state, storeFurniture('desk'))
    expect(state.placed.desk).toBe(false)
    expect(state.offsets.desk).toBeUndefined()
    expect(state.selected).toBeNull()
  })

  it('placeFurniture でバッグの家具を部屋に出すと、その家具が選ばれた状態になる', () => {
    const state = roomLayoutReducer(editing, placeFurniture('guitar'))
    expect(state.placed.guitar).toBe(true)
    expect(state.selected).toBe('guitar')
  })

  it('バッグの中の家具は選べない', () => {
    expect(roomLayoutReducer(editing, selectFurniture('sofa')).selected).toBeNull()
  })

  it('setWallpaper / setAvatar / setTab で壁紙・住人・タブを変える', () => {
    let state = roomLayoutReducer(editing, setWallpaper('gingham'))
    state = roomLayoutReducer(state, setAvatar('boy'))
    state = roomLayoutReducer(state, setTab('avatar'))
    expect(state.wallpaper).toBe('gingham')
    expect(state.avatar).toBe('boy')
    expect(state.tab).toBe('avatar')
  })

  it('resetLayout で家具の配置と出し入れを初期状態に戻す（壁紙と住人はそのまま）', () => {
    let state = roomLayoutReducer(editing, moveFurniture({ id: 'bed', offset: { x: 1, z: 1 } }))
    state = roomLayoutReducer(state, storeFurniture('desk'))
    state = roomLayoutReducer(state, placeFurniture('sofa'))
    state = roomLayoutReducer(state, setWallpaper('wood'))
    state = roomLayoutReducer(state, resetLayout())
    expect(state.offsets).toEqual({})
    expect(state.placed).toEqual(initial.placed)
    expect(state.wallpaper).toBe('wood')
    expect(state.editing).toBe(true)
  })

  it('模様替えモードを終えても、模様替えの内容は残る', () => {
    let state = roomLayoutReducer(editing, moveFurniture({ id: 'desk', offset: { x: 0, z: 0.4 } }))
    state = roomLayoutReducer(state, setAvatar('boy'))
    state = roomLayoutReducer(state, finishEditing())
    expect(state.offsets).toEqual({ desk: { x: 0, z: 0.4 } })
    expect(state.avatar).toBe('boy')
  })

  describe('loadRoom / resetRoom', () => {
    const saved: Room = {
      avatar: 'boy',
      wallpaper: 'night',
      furniture: [
        { id: 'bed', placed: false, x: 0, z: 0 },
        { id: 'sofa', placed: true, x: -0.5, z: 0.25 },
        { id: 'desk', placed: true, x: 0, z: 0 },
      ],
    }

    it('サーバーの部屋を読み込む。含まれていない家具は初期状態になる', () => {
      const dirty = roomLayoutReducer(editing, moveFurniture({ id: 'chair', offset: { x: 1, z: 1 } }))
      const state = roomLayoutReducer(dirty, loadRoom(saved))
      expect(state.avatar).toBe('boy')
      expect(state.wallpaper).toBe('night')
      expect(state.placed.bed).toBe(false)
      expect(state.placed.sofa).toBe(true)
      expect(state.placed.chair).toBe(true)
      expect(state.placed.guitar).toBe(false)
      expect(state.offsets).toEqual({ sofa: { x: -0.5, z: 0.25 } })
    })

    it('知らない家具・壁紙・住人は無視して初期値にする', () => {
      const broken = { avatar: 'robot', wallpaper: 'gold', furniture: [{ id: 'piano', placed: true, x: 1, z: 1 }] } as unknown as Room
      const state = roomLayoutReducer(initial, loadRoom(broken))
      expect(state.avatar).toBe('girl')
      expect(state.wallpaper).toBe('meadow')
      expect(state.placed).toEqual(initial.placed)
    })

    it('resetRoom で部屋をまるごと初期状態に戻す', () => {
      const loaded = roomLayoutReducer(editing, loadRoom(saved))
      expect(roomLayoutReducer(loaded, resetRoom())).toEqual(initial)
    })
  })

  describe('セレクター', () => {
    it('動かしていない家具は (0, 0) を返し、毎回同じオブジェクトになる', () => {
      const store = makeStore()
      const a = selectFurnitureOffset(store.getState(), 'rug')
      const b = selectFurnitureOffset(store.getState(), 'rug')
      expect(a).toEqual({ x: 0, z: 0 })
      expect(a).toBe(b)
    })

    it('バッグの中の家具と部屋に出ている家具を、カタログの順に返す', () => {
      const store = makeStore()
      expect(selectBagItems(store.getState())).toEqual(['bookshelf', 'sofa', 'beanbag', 'lowTable', 'floorLamp', 'guitar', 'fishbowl', 'cactus'])
      store.dispatch(startEditing())
      store.dispatch(storeFurniture('bed'))
      store.dispatch(placeFurniture('cactus'))
      expect(selectBagItems(store.getState())[0]).toBe('bed')
      expect(selectPlacedItems(store.getState())).toContain('cactus')
      expect(selectPlacedItems(store.getState())).not.toContain('bed')
    })

    it('動かしたり出し入れしたりしたかどうか、模様替えモードかを返す', () => {
      const store = makeStore()
      expect(selectHasMovedFurniture(store.getState())).toBe(false)
      expect(selectIsEditingLayout(store.getState())).toBe(false)
      store.dispatch(startEditing())
      store.dispatch(placeFurniture('sofa'))
      expect(selectHasMovedFurniture(store.getState())).toBe(true)
      expect(selectIsEditingLayout(store.getState())).toBe(true)
      store.dispatch(storeFurniture('sofa'))
      expect(selectHasMovedFurniture(store.getState())).toBe(false)
      store.dispatch(moveFurniture({ id: 'sideTable', offset: { x: -1, z: 0.5 } }))
      expect(selectHasMovedFurniture(store.getState())).toBe(true)
    })

    it('保存用に、全部の家具の状態を入れた部屋を返す', () => {
      const store = makeStore()
      store.dispatch(startEditing())
      store.dispatch(moveFurniture({ id: 'bed', offset: { x: -0.5, z: 0.3 } }))
      store.dispatch(placeFurniture('guitar'))
      store.dispatch(setWallpaper('dots'))
      const room = selectRoomForSave(store.getState())
      expect(room.wallpaper).toBe('dots')
      expect(room.avatar).toBe('girl')
      expect(room.furniture).toHaveLength(FURNITURE_IDS.length)
      expect(room.furniture).toContainEqual({ id: 'bed', placed: true, x: -0.5, z: 0.3 })
      expect(room.furniture).toContainEqual({ id: 'guitar', placed: true, x: 0, z: 0 })
      expect(room.furniture).toContainEqual({ id: 'sofa', placed: false, x: 0, z: 0 })
    })
  })
})
