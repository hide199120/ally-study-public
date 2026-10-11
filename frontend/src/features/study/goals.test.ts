import type { StudyGoal } from '../../api/types'
import { dueText, sortGoals } from './goals'

const goal = (over: Partial<StudyGoal>): StudyGoal => ({ id: 'x', kind: 'task', title: 't', done: false, ...over })

describe('goals', () => {
  it('未完了を先に、日付が近い順（日付なしは後ろ）に並べる', () => {
    const sorted = sortGoals([
      goal({ id: 'done', done: true, dueDate: '2026-10-01' }),
      goal({ id: 'none' }),
      goal({ id: 'late', dueDate: '2026-12-01' }),
      goal({ id: 'soon', dueDate: '2026-10-20' }),
    ])
    expect(sorted.map((g) => g.id)).toEqual(['soon', 'late', 'none', 'done'])
  })

  it('資格は試験日までの日数、タスクは期限を出す', () => {
    const today = new Date(2026, 9, 12)
    expect(dueText(goal({ kind: 'certification', dueDate: '2026-10-25' }), today)).toBe('試験まで あと13日（10/25）')
    expect(dueText(goal({ kind: 'certification', dueDate: '2026-10-12' }), today)).toBe('今日が試験日')
    expect(dueText(goal({ kind: 'certification', dueDate: '2026-10-01' }), today)).toBe('試験日（10/1）を過ぎました')
    expect(dueText(goal({ dueDate: '2026-10-15' }), today)).toBe('期限 10/15（あと3日）')
    expect(dueText(goal({ dueDate: '2026-10-10' }), today)).toBe('期限 10/10（2日過ぎ）')
    expect(dueText(goal({}), today)).toBeNull()
  })
})
