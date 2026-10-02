import { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { SOUNDS, type SoundInfo } from './catalog'
import { soundEngine } from './engine'
import { pauseSound, playSound, selectIsSoundPlaying, selectSelectedSounds, selectSoundTracks, setVolume, stopAllSounds, toggleSound } from './soundSlice'
import { useSoundSync } from './useSoundSync'
import './sound.css'

const MUSIC = SOUNDS.filter((s) => s.category === 'music')
const AMBIENT = SOUNDS.filter((s) => s.category === 'ambient')

/** 左上のサウンドウィジェット。再生/一時停止と、BGM・環境音を選ぶパネル */
export default function SoundWidget() {
  useSoundSync()
  const dispatch = useAppDispatch()
  const playing = useAppSelector(selectIsSoundPlaying)
  const selected = useAppSelector(selectSelectedSounds)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  // パネルの外をクリック / Esc で閉じる
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const title = selected.length > 0 ? selected.map((s) => s.name).join(' + ') : '音を選んでください'

  return (
    <div className="sound" ref={root}>
      <div className={`widget sound-bar${playing ? ' is-playing' : ''}`}>
        <button
          type="button"
          className="sound-bar__play"
          aria-label={playing ? '一時停止' : '再生'}
          onClick={() => {
            soundEngine.unlock()
            dispatch(playing ? pauseSound() : playSound())
          }}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
          )}
        </button>
        <button
          type="button"
          className="sound-bar__open"
          aria-expanded={open}
          aria-controls="sound-panel"
          aria-label="音を選ぶ"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sound-bar__text">
            <span className="sound-bar__label">{playing ? 'Now playing' : 'Sound'}</span>
            <span className="sound-bar__title">{title}</span>
          </span>
          <span className="sound-bar__eq" aria-hidden>
            <i /><i /><i /><i />
          </span>
          <svg className={`sound-bar__chev${open ? ' is-open' : ''}`} viewBox="0 0 24 24" aria-hidden><path d="M7 10l5 5 5-5" /></svg>
        </button>
      </div>

      {open && (
        <section id="sound-panel" className="widget sound-panel" aria-label="音を選ぶ">
          <h3 className="sound-panel__head">
            BGM <small>1つ選べます</small>
          </h3>
          <ul className="sound-panel__list">
            {MUSIC.map((s) => (
              <SoundItem key={s.id} sound={s} />
            ))}
          </ul>
          <h3 className="sound-panel__head">
            環境音 <small>重ねて流せます</small>
          </h3>
          <ul className="sound-panel__list sound-panel__list--grid">
            {AMBIENT.map((s) => (
              <SoundItem key={s.id} sound={s} />
            ))}
          </ul>
          <button type="button" className="sound-panel__stop" onClick={() => dispatch(stopAllSounds())} disabled={selected.length === 0}>
            すべて止める
          </button>
        </section>
      )}
    </div>
  )
}

function SoundItem({ sound }: { sound: SoundInfo }) {
  const dispatch = useAppDispatch()
  const track = useAppSelector(selectSoundTracks)[sound.id]
  return (
    <li className={`sound-item${track.on ? ' is-on' : ''}`}>
      <button
        type="button"
        className="sound-item__toggle"
        aria-pressed={track.on}
        onClick={() => {
          soundEngine.unlock()
          dispatch(toggleSound(sound.id))
        }}
      >
        <span className="sound-item__icon" aria-hidden>
          {sound.icon}
        </span>
        <span className="sound-item__name">{sound.name}</span>
      </button>
      {track.on && (
        <input
          type="range"
          className="sound-item__volume"
          min={0}
          max={1}
          step={0.01}
          value={track.volume}
          aria-label={`${sound.name}の音量`}
          onChange={(e) => dispatch(setVolume({ id: sound.id, volume: Number(e.target.value) }))}
        />
      )}
    </li>
  )
}
