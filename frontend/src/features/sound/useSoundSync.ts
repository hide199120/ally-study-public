import { useEffect } from 'react'
import { useAppSelector } from '../../app/hooks'
import { SOUND_IDS } from './catalog'
import { soundEngine } from './engine'
import { selectSoundPaused, selectSoundTracks } from './soundSlice'

/** Redux の状態が変わったら、音のエンジンをその状態に合わせる */
export function useSoundSync() {
  const tracks = useAppSelector(selectSoundTracks)
  const paused = useAppSelector(selectSoundPaused)
  useEffect(() => {
    soundEngine.sync(SOUND_IDS.map((id) => ({ id, playing: tracks[id].on && !paused, volume: tracks[id].volume })))
  }, [tracks, paused])
}
