/* 目標リストの並び替えや表示用の文言（React に依存しない関数だけ） */
import type { GoalKind, StudyGoal } from '../../api/types'
import { daysUntil, parseDateKey } from './time'

export const MAX_GOALS = 30
export const KIND_LABEL: Record<GoalKind, string> = { certification: '資格', task: 'タスク' }

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** 終わっていないものを先に、その中では日付が近い順（日付なしは後ろ）に並べる */
export function sortGoals(goals: StudyGoal[]): StudyGoal[] {
  return [...goals].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return 0
  })
}

/** 日付の横に出す一言（「試験まで あと12日」など） */
export function dueText(goal: StudyGoal, today: Date): string | null {
  if (!goal.dueDate) return null
  const n = daysUntil(goal.dueDate, today)
  const d = parseDateKey(goal.dueDate)
  const md = `${d.getMonth() + 1}/${d.getDate()}`
  if (goal.kind === 'certification') {
    if (n > 0) return `試験まで あと${n}日（${md}）`
    if (n === 0) return '今日が試験日'
    return `試験日（${md}）を過ぎました`
  }
  if (n > 0) return `期限 ${md}（あと${n}日）`
  if (n === 0) return `期限 ${md}（今日）`
  return `期限 ${md}（${-n}日過ぎ）`
}
