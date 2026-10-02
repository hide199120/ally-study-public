import { makeStore } from '../../app/store'
import {
  pauseSound,
  playSound,
  selectIsSoundPlaying,
  selectSelectedSounds,
  setVolume,
  soundReducer,
  stopAllSounds,
  toggleSound,
} from './soundSlice'

describe('soundSlice', () => {
  const initial = soundReducer(undefined, { type: '@@INIT' })
  const onIds = (state: typeof initial) => Object.entries(state.tracks).filter(([, t]) => t.on).map(([id]) => id)

  it('初期状態では Lo-fi room が選ばれていて、一時停止している', () => {
    expect(onIds(initial)).toEqual(['lofiRoom'])
    expect(initial.paused).toBe(true)
  })

  it('環境音は重ねて選べて、選ぶと再生が始まる', () => {
    let state = soundReducer(initial, toggleSound('rain'))
    state = soundReducer(state, toggleSound('fire'))
    expect(onIds(state)).toEqual(['lofiRoom', 'rain', 'fire'])
    expect(state.paused).toBe(false)
  })

  it('BGMは1つだけ。別のBGMを選ぶと前のBGMは止まる', () => {
    const state = soundReducer(initial, toggleSound('piano'))
    expect(state.tracks.piano.on).toBe(true)
    expect(state.tracks.lofiRoom.on).toBe(false)
  })

  it('BGMを選んでも環境音はそのまま', () => {
    let state = soundReducer(initial, toggleSound('rain'))
    state = soundReducer(state, toggleSound('musicBox'))
    expect(onIds(state)).toEqual(['musicBox', 'rain'])
  })

  it('最後の音をオフにすると一時停止になる', () => {
    let state = soundReducer(initial, playSound())
    state = soundReducer(state, toggleSound('lofiRoom'))
    expect(onIds(state)).toEqual([])
    expect(state.paused).toBe(true)
  })

  it('setVolume は 0〜1 の範囲におさめる', () => {
    expect(soundReducer(initial, setVolume({ id: 'rain', volume: 0.3 })).tracks.rain.volume).toBe(0.3)
    expect(soundReducer(initial, setVolume({ id: 'rain', volume: 2 })).tracks.rain.volume).toBe(1)
    expect(soundReducer(initial, setVolume({ id: 'rain', volume: -1 })).tracks.rain.volume).toBe(0)
  })

  it('playSound は何も選んでいなければ Lo-fi room を流す', () => {
    const empty = soundReducer(initial, stopAllSounds())
    const state = soundReducer(empty, playSound())
    expect(onIds(state)).toEqual(['lofiRoom'])
    expect(state.paused).toBe(false)
  })

  it('pauseSound は選んだ音を覚えたまま止める', () => {
    let state = soundReducer(initial, toggleSound('rain'))
    state = soundReducer(state, pauseSound())
    expect(state.paused).toBe(true)
    expect(onIds(state)).toEqual(['lofiRoom', 'rain'])
  })

  it('stopAllSounds はすべてオフにする', () => {
    let state = soundReducer(initial, toggleSound('rain'))
    state = soundReducer(state, stopAllSounds())
    expect(onIds(state)).toEqual([])
    expect(state.paused).toBe(true)
  })

  it('セレクターで選んでいる音と、鳴っているかを取れる', () => {
    const store = makeStore()
    expect(selectIsSoundPlaying(store.getState())).toBe(false)
    store.dispatch(toggleSound('rain'))
    expect(selectSelectedSounds(store.getState()).map((s) => s.name)).toEqual(['Lo-fi room', '雨'])
    expect(selectIsSoundPlaying(store.getState())).toBe(true)
  })
})
