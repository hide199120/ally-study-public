import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../app/store'
import type { StudyGoal, StudyMode, StudyOverview } from '../../api/types'

export type TimerMode = StudyMode
export type PomodoroPreset = 'short' | 'long'
export type TimerStatus = 'idle' | 'running' | 'paused'
export type PomodoroPhase = 'focus' | 'break'

/** ポモドーロの長さ（分） */
export const POMODORO_PRESETS: Record<PomodoroPreset, { focus: number; break: number; label: string }> = {
  short: { focus: 25, break: 5, label: '25分 / 休憩5分' },
  long: { focus: 50, break: 10, label: '50分 / 休憩10分' },
}

export const DEFAULT_WEEKLY_GOAL_MINUTES = 600
const MINUTE = 60_000

/**
 * タイマーの状態。
 * 経過時間を毎秒足していくと、タブが裏にあるときなどにずれるので、
 * 「いつ終わるか（endsAt）」「いつ始めたか（startedAt）」の時刻で持ち、表示のたびに計算する
 */
type TimerState = {
  mode: TimerMode
  preset: PomodoroPreset
  phase: PomodoroPhase
  status: TimerStatus
  /** ポモドーロ：動いているときの終了時刻（ミリ秒） */
  endsAt: number | null
  /** ポモドーロ：止まっているときの残り時間 */
  remainingMs: number
  /** ストップウォッチ：動き出した時刻 */
  startedAt: number | null
  /** ストップウォッチ：一時停止までにたまった時間 */
  elapsedMs: number
  /** 集中を終えた回数 */
  completedFocus: number
}

type StudyState = {
  /** 日付キー（YYYY-MM-DD）ごとの勉強時間（分） */
  days: Record<string, number>
  weeklyGoalMinutes: number
  goals: StudyGoal[]
  /** サーバーへの保存に失敗したときのメッセージ */
  syncError: string | null
  timer: TimerState
  /** タイマーのお知らせ（「25分を記録しました」など） */
  notice: string | null
}

const focusMs = (preset: PomodoroPreset) => POMODORO_PRESETS[preset].focus * MINUTE
const breakMs = (preset: PomodoroPreset) => POMODORO_PRESETS[preset].break * MINUTE

const initialTimer = (mode: TimerMode = 'pomodoro', preset: PomodoroPreset = 'short', completedFocus = 0): TimerState => ({
  mode,
  preset,
  phase: 'focus',
  status: 'idle',
  endsAt: null,
  remainingMs: focusMs(preset),
  startedAt: null,
  elapsedMs: 0,
  completedFocus,
})

const initialState: StudyState = {
  days: {},
  weeklyGoalMinutes: DEFAULT_WEEKLY_GOAL_MINUTES,
  goals: [],
  syncError: null,
  timer: initialTimer(),
  notice: null,
}

/** 学習記録（勉強時間・週の目標・目標リスト）とタイマー */
const studySlice = createSlice({
  name: 'study',
  initialState,
  reducers: {
    /* ---------- タイマー ---------- */
    setTimerMode(state, action: PayloadAction<TimerMode>) {
      state.timer = initialTimer(action.payload, state.timer.preset, state.timer.completedFocus)
    },
    setPomodoroPreset(state, action: PayloadAction<PomodoroPreset>) {
      state.timer = initialTimer('pomodoro', action.payload, state.timer.completedFocus)
    },
    startTimer(state, action: PayloadAction<{ now: number }>) {
      const t = state.timer
      if (t.status === 'running') return
      if (t.mode === 'pomodoro') t.endsAt = action.payload.now + t.remainingMs
      else t.startedAt = action.payload.now
      t.status = 'running'
    },
    pauseTimer(state, action: PayloadAction<{ now: number }>) {
      const t = state.timer
      if (t.status !== 'running') return
      if (t.mode === 'pomodoro') {
        t.remainingMs = Math.max(0, (t.endsAt ?? action.payload.now) - action.payload.now)
        t.endsAt = null
      } else {
        t.elapsedMs += action.payload.now - (t.startedAt ?? action.payload.now)
        t.startedAt = null
      }
      t.status = 'paused'
    },
    resetTimer(state) {
      state.timer = initialTimer(state.timer.mode, state.timer.preset, state.timer.completedFocus)
    },
    /**
     * ポモドーロの1区切りを終える。
     * 集中 → 休憩（休憩はそのまま自動で始める）、休憩 → 次の集中（開始ボタンを押すまで待つ）
     */
    completePhase(state, action: PayloadAction<{ now: number }>) {
      const t = state.timer
      if (t.mode !== 'pomodoro') return
      if (t.phase === 'focus') {
        t.completedFocus += 1
        t.phase = 'break'
        t.status = 'running'
        t.endsAt = action.payload.now + breakMs(t.preset)
        t.remainingMs = breakMs(t.preset)
      } else {
        t.phase = 'focus'
        t.status = 'idle'
        t.endsAt = null
        t.remainingMs = focusMs(t.preset)
      }
    },

    /* ---------- 勉強時間 ---------- */
    addMinutes(state, action: PayloadAction<{ date: string; minutes: number }>) {
      const { date, minutes } = action.payload
      state.days[date] = (state.days[date] ?? 0) + minutes
    },
    /** サーバーが返したその日の合計で上書きする（サーバーの値を正とする） */
    setDayTotal(state, action: PayloadAction<{ date: string; minutes: number }>) {
      state.days[action.payload.date] = action.payload.minutes
    },
    setWeeklyGoal(state, action: PayloadAction<number>) {
      state.weeklyGoalMinutes = action.payload
    },

    /* ---------- 目標（資格・タスク） ---------- */
    addGoal(state, action: PayloadAction<StudyGoal>) {
      state.goals.push(action.payload)
    },
    toggleGoal(state, action: PayloadAction<string>) {
      const goal = state.goals.find((g) => g.id === action.payload)
      if (goal) goal.done = !goal.done
    },
    removeGoal(state, action: PayloadAction<string>) {
      state.goals = state.goals.filter((g) => g.id !== action.payload)
    },

    /* ---------- サーバーとの同期 ---------- */
    loadStudy(state, action: PayloadAction<StudyOverview>) {
      const o = action.payload
      state.days = Object.fromEntries(o.days.map((d) => [d.date, d.minutes]))
      state.weeklyGoalMinutes = o.weeklyGoalMinutes
      state.goals = o.goals
      state.syncError = null
    },
    /** ログアウトしたときなど、記録を初期状態に戻す（動いているタイマーはそのまま） */
    resetStudyData(state) {
      state.days = {}
      state.weeklyGoalMinutes = DEFAULT_WEEKLY_GOAL_MINUTES
      state.goals = []
      state.syncError = null
    },
    setSyncError(state, action: PayloadAction<string | null>) {
      state.syncError = action.payload
    },
    setNotice(state, action: PayloadAction<string | null>) {
      state.notice = action.payload
    },
  },
})

export const {
  setTimerMode,
  setPomodoroPreset,
  startTimer,
  pauseTimer,
  resetTimer,
  completePhase,
  addMinutes,
  setDayTotal,
  setWeeklyGoal,
  addGoal,
  toggleGoal,
  removeGoal,
  loadStudy,
  resetStudyData,
  setSyncError,
  setNotice,
} = studySlice.actions
export const studyReducer = studySlice.reducer

export const selectTimer = (state: RootState) => state.study.timer
export const selectStudyDays = (state: RootState) => state.study.days
export const selectWeeklyGoalMinutes = (state: RootState) => state.study.weeklyGoalMinutes
export const selectGoals = (state: RootState) => state.study.goals
export const selectStudySyncError = (state: RootState) => state.study.syncError
export const selectTimerNotice = (state: RootState) => state.study.notice

/** ポモドーロの残り時間（ミリ秒） */
export function remainingMs(timer: TimerState, now: number): number {
  if (timer.status === 'running' && timer.endsAt !== null) return Math.max(0, timer.endsAt - now)
  return timer.remainingMs
}

/** ストップウォッチの経過時間（ミリ秒） */
export function elapsedMs(timer: TimerState, now: number): number {
  if (timer.status === 'running' && timer.startedAt !== null) return timer.elapsedMs + (now - timer.startedAt)
  return timer.elapsedMs
}

/** 今の区切りの長さ（ミリ秒）。進み具合のバーに使う */
export function phaseLengthMs(timer: TimerState): number {
  return timer.phase === 'focus' ? focusMs(timer.preset) : breakMs(timer.preset)
}
