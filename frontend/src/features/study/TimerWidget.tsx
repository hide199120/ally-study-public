import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { playChime, unlockChime } from './chime'
import {
  POMODORO_PRESETS,
  completePhase,
  elapsedMs,
  pauseTimer,
  phaseLengthMs,
  remainingMs,
  resetTimer,
  selectTimer,
  selectTimerNotice,
  setNotice as setNoticeAction,
  setPomodoroPreset,
  setTimerMode,
  startTimer,
  type PomodoroPreset,
  type TimerMode,
} from './studySlice'
import { finishPomodoroPhase, recordStudy } from './studyThunks'
import { formatClock, formatElapsed, formatMinutes } from './time'
import { useNow } from './useNow'
import './study.css'

const MODES: { id: TimerMode; label: string }[] = [
  { id: 'pomodoro', label: 'ポモドーロ' },
  { id: 'stopwatch', label: 'ストップウォッチ' },
]
const BASE_TITLE = typeof document !== 'undefined' ? document.title : ''

/** 左側の勉強タイマー（ポモドーロ / ストップウォッチ） */
export default function TimerWidget() {
  const dispatch = useAppDispatch()
  const timer = useAppSelector(selectTimer)
  const running = timer.status === 'running'
  const now = useNow(running)
  const notice = useAppSelector(selectTimerNotice)
  const setNotice = (message: string | null) => dispatch(setNoticeAction(message))

  const isPomodoro = timer.mode === 'pomodoro'
  const length = phaseLengthMs(timer)
  // 表示用の時刻は少し古いことがあるので、範囲からはみ出さないようにする
  const left = Math.min(length, remainingMs(timer, now))
  const elapsed = Math.max(timer.elapsedMs, elapsedMs(timer, now))
  const display = isPomodoro ? formatClock(left) : formatElapsed(elapsed)
  const phaseLabel = isPomodoro ? (timer.phase === 'focus' ? '集中' : '休憩') : '計測'

  // ポモドーロの区切りが来たら、記録して次へ進む
  useEffect(() => {
    if (!isPomodoro || !running || left > 0) return
    void dispatch(finishPomodoroPhase(Date.now()))
    playChime()
  }, [dispatch, isPomodoro, running, left])

  // 動いている間は、タブのタイトルに残り時間を出す
  useEffect(() => {
    if (!running) {
      document.title = BASE_TITLE
      return
    }
    document.title = `${display} ${phaseLabel}中 | ${BASE_TITLE}`
  }, [running, display, phaseLabel])
  useEffect(() => () => void (document.title = BASE_TITLE), [])

  // お知らせは少ししたら消す
  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => dispatch(setNoticeAction(null)), 6000)
    return () => window.clearTimeout(id)
  }, [dispatch, notice])

  const start = () => {
    unlockChime()
    setNotice(null)
    dispatch(startTimer({ now: Date.now() }))
  }

  const finishStopwatch = () => {
    const minutes = Math.floor(elapsedMs(timer, Date.now()) / 60_000)
    dispatch(resetTimer())
    if (minutes < 1) {
      setNotice('1分未満は記録されません')
      return
    }
    void dispatch(recordStudy({ minutes, mode: 'stopwatch' }))
    setNotice(`${formatMinutes(minutes)}を記録しました`)
  }

  const progress = isPomodoro ? 1 - left / length : 0

  return (
    <section className="widget study-card timer" aria-label="勉強タイマー">
      <div className="study-tabs" role="radiogroup" aria-label="タイマーの種類">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={timer.mode === m.id}
            className="study-tabs__tab"
            disabled={timer.status !== 'idle' && timer.mode !== m.id}
            onClick={() => dispatch(setTimerMode(m.id))}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="timer__head">
        <span className={`timer__phase timer__phase--${isPomodoro ? timer.phase : 'watch'}`}>{phaseLabel}</span>
        {isPomodoro && (
          <span className="timer__count" aria-label={`集中した回数 ${timer.completedFocus}回`}>
            🍅 × {timer.completedFocus}
          </span>
        )}
      </div>

      <p className="timer__time" role="timer" aria-live="off">
        {display}
      </p>

      {isPomodoro && (
        <div className="timer__bar" aria-hidden>
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}

      <div className="timer__buttons">
        {running ? (
          <button type="button" className="study-btn" onClick={() => dispatch(pauseTimer({ now: Date.now() }))}>
            一時停止
          </button>
        ) : (
          <button type="button" className="study-btn study-btn--primary" onClick={start}>
            {timer.status === 'paused' ? '再開' : '開始'}
          </button>
        )}
        {!isPomodoro && timer.status !== 'idle' && (
          <button type="button" className="study-btn study-btn--primary" onClick={finishStopwatch}>
            記録して終了
          </button>
        )}
        {isPomodoro && timer.phase === 'break' && (
          <button type="button" className="study-btn" onClick={() => dispatch(completePhase({ now: Date.now() }))}>
            休憩をスキップ
          </button>
        )}
        {timer.status !== 'idle' && (
          <button type="button" className="study-btn study-btn--ghost" onClick={() => dispatch(resetTimer())}>
            リセット
          </button>
        )}
      </div>

      {isPomodoro && (
        <label className="timer__preset">
          <span>長さ</span>
          <select
            value={timer.preset}
            disabled={timer.status !== 'idle'}
            onChange={(e) => dispatch(setPomodoroPreset(e.target.value as PomodoroPreset))}
          >
            {(Object.keys(POMODORO_PRESETS) as PomodoroPreset[]).map((p) => (
              <option key={p} value={p}>
                {POMODORO_PRESETS[p].label}
              </option>
            ))}
          </select>
        </label>
      )}

      {notice && (
        <p className="study-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  )
}
