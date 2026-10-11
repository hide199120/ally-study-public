import {
  completePhase,
  elapsedMs,
  loadStudy,
  pauseTimer,
  remainingMs,
  resetStudyData,
  setPomodoroPreset,
  setTimerMode,
  startTimer,
  studyReducer,
  addMinutes,
  setDayTotal,
} from './studySlice'

const MIN = 60_000
const initial = studyReducer(undefined, { type: '@@init' })

describe('studySlice: タイマー', () => {
  it('ポモドーロは終了時刻で残り時間を計算し、一時停止で残りを保存する', () => {
    let s = studyReducer(initial, startTimer({ now: 0 }))
    expect(s.timer.status).toBe('running')
    expect(remainingMs(s.timer, 10 * MIN)).toBe(15 * MIN)

    s = studyReducer(s, pauseTimer({ now: 10 * MIN }))
    expect(s.timer.status).toBe('paused')
    // 止まっている間は時間がたっても減らない
    expect(remainingMs(s.timer, 99 * MIN)).toBe(15 * MIN)

    s = studyReducer(s, startTimer({ now: 100 * MIN }))
    expect(remainingMs(s.timer, 105 * MIN)).toBe(10 * MIN)
  })

  it('集中が終わると休憩が自動で始まり、休憩が終わると次の集中を待つ', () => {
    let s = studyReducer(initial, startTimer({ now: 0 }))
    s = studyReducer(s, completePhase({ now: 25 * MIN }))
    expect(s.timer).toMatchObject({ phase: 'break', status: 'running', completedFocus: 1 })
    expect(remainingMs(s.timer, 27 * MIN)).toBe(3 * MIN)

    s = studyReducer(s, completePhase({ now: 30 * MIN }))
    expect(s.timer).toMatchObject({ phase: 'focus', status: 'idle', remainingMs: 25 * MIN })
  })

  it('長さを50分にすると集中が50分になる', () => {
    const s = studyReducer(initial, setPomodoroPreset('long'))
    expect(s.timer.remainingMs).toBe(50 * MIN)
  })

  it('ストップウォッチは一時停止をはさんでも経過時間を足していく', () => {
    let s = studyReducer(initial, setTimerMode('stopwatch'))
    s = studyReducer(s, startTimer({ now: 0 }))
    s = studyReducer(s, pauseTimer({ now: 5 * MIN }))
    s = studyReducer(s, startTimer({ now: 50 * MIN }))
    expect(elapsedMs(s.timer, 53 * MIN)).toBe(8 * MIN)
  })
})

describe('studySlice: 記録', () => {
  it('勉強時間を足し、サーバーの合計で上書きできる', () => {
    let s = studyReducer(initial, addMinutes({ date: '2026-10-12', minutes: 25 }))
    s = studyReducer(s, addMinutes({ date: '2026-10-12', minutes: 10 }))
    expect(s.days['2026-10-12']).toBe(35)
    s = studyReducer(s, setDayTotal({ date: '2026-10-12', minutes: 60 }))
    expect(s.days['2026-10-12']).toBe(60)
  })

  it('サーバーの記録を読み込み、ログアウトで初期状態に戻す（タイマーはそのまま）', () => {
    let s = studyReducer(initial, startTimer({ now: 0 }))
    s = studyReducer(
      s,
      loadStudy({ weeklyGoalMinutes: 300, goals: [{ id: 'a', kind: 'task', title: 'x', done: false }], days: [{ date: '2026-10-12', minutes: 40 }] }),
    )
    expect(s.weeklyGoalMinutes).toBe(300)
    expect(s.days).toEqual({ '2026-10-12': 40 })

    s = studyReducer(s, resetStudyData())
    expect(s.days).toEqual({})
    expect(s.goals).toEqual([])
    expect(s.weeklyGoalMinutes).toBe(600)
    expect(s.timer.status).toBe('running')
  })
})
