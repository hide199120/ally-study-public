import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import type { RootState } from '../../app/store'
import { authApi } from '../auth/authApi'
import { roomApi } from '../room/roomApi'
import type { SoundId } from '../sound/catalog'
import { pauseSound, playSound, selectSelectedSounds, selectSoundPaused, stopAllSounds, toggleSound } from '../sound/soundSlice'
import { addMinutes } from '../study/studySlice'
import { setTheme } from '../theme/themeSlice'
import { tracker as defaultTracker, type Tracker } from './tracker'

/** 今鳴っている音の ID（一時停止中なら空） */
function playingSounds(state: RootState): SoundId[] {
  if (selectSoundPaused(state)) return []
  return selectSelectedSounds(state).map((s) => s.id)
}

/**
 * Redux のアクションを見て、アクセス解析のイベントを記録する。
 * 各機能のコードには解析の処理を書かず、ここにまとめる（機能と解析を切り離すため）。
 */
export function createAnalyticsListener(tracker: Tracker = defaultTracker, now: () => number = () => Date.now()) {
  const listener = createListenerMiddleware()
  /** 音ごとの、流し始めた時刻 */
  const soundStartedAt = new Map<SoundId, number>()

  function stopSound(id: SoundId, at: number) {
    const started = soundStartedAt.get(id)
    if (started === undefined) return
    soundStartedAt.delete(id)
    tracker.track('sound_stop', { soundId: id, durationSec: Math.max(0, Math.round((at - started) / 1000)) })
  }

  // BGM・環境音：鳴り始めた音と止まった音を、前の状態と比べて見つける
  listener.startListening({
    matcher: isAnyOf(toggleSound, playSound, pauseSound, stopAllSounds),
    effect: (_action, api) => {
      const before = new Set(playingSounds(api.getOriginalState() as RootState))
      const after = new Set(playingSounds(api.getState() as RootState))
      const at = now()
      for (const id of after) {
        if (!before.has(id)) {
          soundStartedAt.set(id, at)
          tracker.track('sound_play', { soundId: id })
        }
      }
      for (const id of before) {
        if (!after.has(id)) stopSound(id, at)
      }
    },
  })

  listener.startListening({
    matcher: roomApi.endpoints.saveRoom.matchFulfilled,
    effect: () => tracker.track('room_save'),
  })

  listener.startListening({
    actionCreator: addMinutes,
    effect: (action) => tracker.track('study_session', { minutes: action.payload.minutes }),
  })

  listener.startListening({
    actionCreator: setTheme,
    effect: (action) => tracker.track('theme_change', { theme: action.payload }),
  })

  listener.startListening({
    matcher: authApi.endpoints.signup.matchFulfilled,
    effect: () => tracker.track('signup'),
  })
  listener.startListening({
    matcher: authApi.endpoints.login.matchFulfilled,
    effect: () => tracker.track('login'),
  })
  listener.startListening({
    matcher: authApi.endpoints.deleteMe.matchFulfilled,
    effect: () => tracker.track('account_delete'),
  })

  return {
    middleware: listener.middleware,
    /** 画面を閉じるときに、鳴っている音の再生時間を記録する */
    stopAllPlayingSounds() {
      const at = now()
      for (const id of [...soundStartedAt.keys()]) stopSound(id, at)
    },
  }
}

export const analyticsListener = createAnalyticsListener()
