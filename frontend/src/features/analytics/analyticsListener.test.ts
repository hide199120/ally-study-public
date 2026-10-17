import { configureStore } from '@reduxjs/toolkit'
import { soundReducer, toggleSound, pauseSound, playSound } from '../sound/soundSlice'
import { studyReducer, addMinutes } from '../study/studySlice'
import { themeReducer, setTheme } from '../theme/themeSlice'
import { authApi } from '../auth/authApi'
import { createAnalyticsListener } from './analyticsListener'
import type { Tracker } from './tracker'

function setup() {
  const track = jest.fn()
  let now = 0
  const listener = createAnalyticsListener({ track } as unknown as Tracker, () => now)
  const store = configureStore({
    reducer: { sound: soundReducer, study: studyReducer, theme: themeReducer, [authApi.reducerPath]: authApi.reducer },
    middleware: (gdm) => gdm().prepend(listener.middleware).concat(authApi.middleware),
  })
  return { store, track, listener, advance: (sec: number) => (now += sec * 1000) }
}

describe('analyticsListener', () => {
  it('音を流したら sound_play、止めたら再生秒数つきの sound_stop を記録する', () => {
    const { store, track, advance } = setup()
    store.dispatch(playSound()) // 最初は Lo-fi room が選ばれている
    expect(track).toHaveBeenCalledWith('sound_play', { soundId: 'lofiRoom' })

    store.dispatch(toggleSound('rain'))
    expect(track).toHaveBeenCalledWith('sound_play', { soundId: 'rain' })

    advance(90)
    store.dispatch(pauseSound())
    expect(track).toHaveBeenCalledWith('sound_stop', { soundId: 'lofiRoom', durationSec: 90 })
    expect(track).toHaveBeenCalledWith('sound_stop', { soundId: 'rain', durationSec: 90 })
  })

  it('画面を閉じるとき、鳴っている音の再生時間を記録する', () => {
    const { store, track, listener, advance } = setup()
    store.dispatch(playSound())
    advance(30)
    listener.stopAllPlayingSounds()
    expect(track).toHaveBeenLastCalledWith('sound_stop', { soundId: 'lofiRoom', durationSec: 30 })
  })

  it('勉強時間の記録とテーマの変更を記録する', () => {
    const { store, track } = setup()
    store.dispatch(addMinutes({ date: '2026-10-17', minutes: 25 }))
    expect(track).toHaveBeenCalledWith('study_session', { minutes: 25 })
    store.dispatch(setTheme('rain'))
    expect(track).toHaveBeenCalledWith('theme_change', { theme: 'rain' })
  })
})
