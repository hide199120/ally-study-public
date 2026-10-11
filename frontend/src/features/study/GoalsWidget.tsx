import { useState, type FormEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import type { GoalKind } from '../../api/types'
import { useGetMeQuery } from '../auth/authApi'
import { selectGoals } from './studySlice'
import { addGoalAndSave, removeGoalAndSave, toggleGoalAndSave } from './studyThunks'
import { MAX_GOALS, KIND_LABEL, dueText, newId, sortGoals } from './goals'
import { daysUntil } from './time'
import { useNow } from './useNow'
import './study.css'

/** 右側の目標リスト（資格・タスク） */
export default function GoalsWidget() {
  const dispatch = useAppDispatch()
  const goals = useAppSelector(selectGoals)
  const { data: me } = useGetMeQuery()
  const today = new Date(useNow(true, 60_000))

  const [kind, setKind] = useState<GoalKind>('certification')
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const full = goals.length >= MAX_GOALS

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || full) return
    void dispatch(
      addGoalAndSave({ id: newId(), kind, title: trimmed.slice(0, 50), done: false, ...(dueDate ? { dueDate } : {}) }),
    )
    setTitle('')
    setDueDate('')
  }

  return (
    <section className="widget study-card goals" aria-label="目標">
      <span className="study-card__label">目標の資格・タスク</span>

      {goals.length === 0 ? (
        <p className="goals__empty">まだ目標がありません。下から追加できます</p>
      ) : (
        <ul className="goals__list">
          {sortGoals(goals).map((g) => {
            const due = dueText(g, today)
            const soon = !g.done && g.dueDate !== undefined && daysUntil(g.dueDate, today) <= 7
            return (
              <li key={g.id} className={`goals__item${g.done ? ' is-done' : ''}`}>
                <input
                  type="checkbox"
                  checked={g.done}
                  onChange={() => void dispatch(toggleGoalAndSave(g.id))}
                  aria-label={`${g.title}を${g.done ? '未完了に戻す' : '完了にする'}`}
                />
                <div className="goals__body">
                  <div className="goals__title-row">
                    <span className={`goals__kind goals__kind--${g.kind}`}>{KIND_LABEL[g.kind]}</span>
                    <span className="goals__title">{g.title}</span>
                  </div>
                  {due && <span className={`goals__due${soon ? ' is-soon' : ''}`}>{due}</span>}
                </div>
                <button
                  type="button"
                  className="goals__remove"
                  onClick={() => void dispatch(removeGoalAndSave(g.id))}
                  aria-label={`${g.title}を削除`}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <form className="goals__form" onSubmit={submit}>
        <div className="goals__form-row">
          <label>
            <span className="visually-hidden">種類</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as GoalKind)}>
              <option value="certification">資格</option>
              <option value="task">タスク</option>
            </select>
          </label>
          <label className="goals__title-input">
            <span className="visually-hidden">目標の名前</span>
            <input
              type="text"
              value={title}
              maxLength={50}
              placeholder={kind === 'certification' ? '例：基本情報技術者' : '例：参考書 3章まで'}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
        </div>
        <div className="goals__form-row">
          <label className="goals__date">
            <span>{kind === 'certification' ? '試験日' : '期限'}</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <button type="submit" className="study-btn study-btn--primary study-btn--small" disabled={!title.trim() || full}>
            追加
          </button>
        </div>
        {full && <p className="study-card__note">目標は{MAX_GOALS}個までです</p>}
      </form>

      {!me && <p className="study-card__note">ログインすると目標が保存されます</p>}
    </section>
  )
}
