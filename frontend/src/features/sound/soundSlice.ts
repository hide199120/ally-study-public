import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../app/store'
import { SOUND_BY_ID, SOUNDS, type SoundId, type SoundInfo } from './catalog'

type TrackState = {
  /** 選ばれているか */
  on: boolean
  /** 音量 0〜1 */
  volume: number
}

type SoundState = {
  tracks: Record<SoundId, TrackState>
  /** 一時停止中か（選んだ音は覚えたまま止める） */
  paused: boolean
}

/** 最初は今までどおり「Lo-fi room」を選んだ状態で、再生ボタンを押すまで止めておく */
const initialState: SoundState = {
  tracks: Object.fromEntries(SOUNDS.map((s) => [s.id, { on: s.id === 'lofiRoom', volume: s.defaultVolume }])) as Record<SoundId, TrackState>,
  paused: true,
}

const DEFAULT_MUSIC: SoundId = 'lofiRoom'

const hasSelection = (state: SoundState) => Object.values(state.tracks).some((t) => t.on)

/** BGMと環境音の「何を・どの音量で流すか」を管理する */
const soundSlice = createSlice({
  name: 'sound',
  initialState,
  reducers: {
    /** 音のオン/オフを切り替える。BGMは1つだけなので、選んだら他のBGMは止める */
    toggleSound(state, action: PayloadAction<SoundId>) {
      const id = action.payload
      const track = state.tracks[id]
      track.on = !track.on
      if (track.on) {
        if (SOUND_BY_ID[id].category === 'music') {
          for (const s of SOUNDS) {
            if (s.category === 'music' && s.id !== id) state.tracks[s.id].on = false
          }
        }
        state.paused = false
      } else if (!hasSelection(state)) {
        state.paused = true
      }
    },
    setVolume(state, action: PayloadAction<{ id: SoundId; volume: number }>) {
      const { id, volume } = action.payload
      state.tracks[id].volume = Math.min(1, Math.max(0, volume))
    },
    /** 再生する。何も選んでいなければ Lo-fi room を流す */
    playSound(state) {
      if (!hasSelection(state)) state.tracks[DEFAULT_MUSIC].on = true
      state.paused = false
    },
    pauseSound(state) {
      state.paused = true
    },
    /** 全部オフにする */
    stopAllSounds(state) {
      for (const track of Object.values(state.tracks)) track.on = false
      state.paused = true
    },
  },
})

export const { toggleSound, setVolume, playSound, pauseSound, stopAllSounds } = soundSlice.actions
export const soundReducer = soundSlice.reducer

export const selectSoundTracks = (state: RootState) => state.sound.tracks
export const selectSoundPaused = (state: RootState) => state.sound.paused

/** 選ばれている音（BGM → 環境音の順） */
export const selectSelectedSounds = createSelector([selectSoundTracks], (tracks): SoundInfo[] => SOUNDS.filter((s) => tracks[s.id].on))

/** 実際に音が鳴っているか */
export const selectIsSoundPlaying = createSelector(
  [selectSelectedSounds, selectSoundPaused],
  (selected, paused) => !paused && selected.length > 0,
)
