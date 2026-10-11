import { useState, type FormEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { useGetMeQuery } from '../auth/authApi'
import { selectStudyDays, selectStudySyncError, selectWeeklyGoalMinutes } from './studySlice'
import { saveWeeklyGoal } from './studyThunks'
import { dateKey, formatMinutes, weekDateKeys } from './time'
import { useNow } from './useNow'
import './study.css'
import WeekChart from './WeekChart'

/** 右側の学習記録：今日の勉強時間・今週の目標・グラフ */
export default function StatsWidget() {
  const dispatch = useAppDispatch()
  const days = useAppSelector(selectStudyDays)
  const weeklyGoal = useAppSelector(selectWeeklyGoalMinutes)
  const syncError = useAppSelector(selectStudySyncError)
  const { data: me } = useGetMeQuery()
  // 日付が変わったときに「今日」を切り替えるため、1分ごとに時刻を取り直す
  const now = new Date(useNow(true, 60_000))
  const todayKey = dateKey(now)
  const week = weekDateKeys(now)

  const today = days[todayKey] ?? 0
  const weekTotal = week.reduce((sum, d) => sum + (days[d] ?? 0), 0)
  const ratio = weeklyGoal > 0 ? Math.min(1, weekTotal / weeklyGoal) : 0

  const [editing, setEditing] = useState(false)
  const [hours, setHours] = useState('')

  const openEditor = () => {
    setHours(String(weeklyGoal / 60))
    setEditing(true)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = Number(hours)
    if (!Number.isFinite(value) || value < 0 || value > 100) return
    void dispatch(saveWeeklyGoal(Math.round(value * 60)))
    setEditing(false)
  }

  return (
    <section className="widget study-card stats" aria-label="学習記録">
      <div className="stats__today">
        <span className="study-card__label">今日の勉強時間</span>
        <strong className="stats__today-value">{formatMinutes(today)}</strong>
      </div>

      <div className="stats__week">
        <div className="stats__week-head">
          <span className="study-card__label">今週の目標</span>
          {!editing && (
            <button type="button" className="study-link" onClick={openEditor}>
              目標を変更
            </button>
          )}
        </div>

        {editing ? (
          <form className="stats__goal-form" onSubmit={submit}>
            <label>
              <span className="visually-hidden">週の目標（時間）</span>
              <input type="number" min={0} max={100} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} autoFocus />
            </label>
            <span>時間 / 週</span>
            <button type="submit" className="study-btn study-btn--primary study-btn--small">
              保存
            </button>
            <button type="button" className="study-btn study-btn--ghost study-btn--small" onClick={() => setEditing(false)}>
              やめる
            </button>
          </form>
        ) : (
          <>
            <p className="stats__week-value">
              <strong>{formatMinutes(weekTotal)}</strong>
              {weeklyGoal > 0 ? <span> / {formatMinutes(weeklyGoal)}</span> : <span>（目標なし）</span>}
            </p>
            {weeklyGoal > 0 && (
              <div
                className="stats__progress"
                role="progressbar"
                aria-label="今週の目標の達成率"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(ratio * 100)}
              >
                <span style={{ width: `${ratio * 100}%` }} />
              </div>
            )}
            {weeklyGoal > 0 && (
              <p className="stats__hint">
                {weekTotal >= weeklyGoal ? '🎉 今週の目標を達成しました！' : `あと ${formatMinutes(weeklyGoal - weekTotal)}`}
              </p>
            )}
          </>
        )}
      </div>

      <WeekChart dates={week} days={days} todayKey={todayKey} dailyTargetMinutes={weeklyGoal / 7} />

      {!me && <p className="study-card__note">ログインすると記録が保存されます</p>}
      {syncError && (
        <p className="study-card__error" role="alert">
          {syncError}
        </p>
      )}
    </section>
  )
}
