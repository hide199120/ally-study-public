import type { ThunkAction, UnknownAction } from '@reduxjs/toolkit'
import type { RootState } from '../../app/store'
import type { StudyGoal, StudyMode } from '../../api/types'
import { authApi } from '../auth/authApi'
import { studyApi } from './studyApi'
import {
  POMODORO_PRESETS,
  addGoal,
  addMinutes,
  completePhase,
  removeGoal,
  setDayTotal,
  setNotice,
  setSyncError,
  setWeeklyGoal,
  toggleGoal,
} from './studySlice'
import { dateKey } from './time'

type AppThunk<R = void> = ThunkAction<R, RootState, unknown, UnknownAction>

const SAVE_FAILED = '保存できませんでした。通信を確認して、もう一度お試しください'

/** ログイン中のユーザー（未ログインなら null）。キャッシュ済みの値を使う */
const currentUser = (state: RootState) => authApi.endpoints.getMe.select()(state).data ?? null

/**
 * 勉強した時間を記録する。
 * 画面にはすぐ反映し（楽観的更新）、ログイン中ならサーバーにも保存して、返ってきたその日の合計で上書きする
 */
export const recordStudy =
  ({ minutes, mode, now = new Date() }: { minutes: number; mode: StudyMode; now?: Date }): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    if (minutes < 1) return
    const date = dateKey(now)
    dispatch(addMinutes({ date, minutes }))
    if (!currentUser(getState())) return
    try {
      const day = await dispatch(studyApi.endpoints.addStudySession.initiate({ date, minutes, mode })).unwrap()
      dispatch(setDayTotal(day))
      dispatch(setSyncError(null))
    } catch {
      dispatch(setSyncError(SAVE_FAILED))
    }
  }

/** ポモドーロの区切りを終える。集中が終わったときは、その時間を記録する */
export const finishPomodoroPhase =
  (now: number): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const timer = getState().study.timer
    if (timer.mode !== 'pomodoro' || timer.status !== 'running') return
    // まだ時間が残っているなら何もしない（同じ区切りを2回終えないように）
    if (timer.endsAt === null || timer.endsAt > now) return
    const wasFocus = timer.phase === 'focus'
    dispatch(completePhase({ now }))
    if (wasFocus) {
      const minutes = POMODORO_PRESETS[timer.preset].focus
      dispatch(setNotice(`${minutes}分を記録しました。休憩しましょう`))
      await dispatch(recordStudy({ minutes, mode: 'pomodoro', now: new Date(now) }))
    } else {
      dispatch(setNotice('休憩おわり。次の集中を始めましょう'))
    }
  }

/** 週の目標時間を変えて、ログイン中なら保存する */
export const saveWeeklyGoal =
  (minutes: number): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    dispatch(setWeeklyGoal(minutes))
    if (!currentUser(getState())) return
    try {
      await dispatch(studyApi.endpoints.saveStudySettings.initiate({ weeklyGoalMinutes: minutes })).unwrap()
      dispatch(setSyncError(null))
    } catch {
      dispatch(setSyncError(SAVE_FAILED))
    }
  }

/** 目標の一覧を変えたあと、ログイン中なら一覧ごと保存する */
const saveGoals = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  if (!currentUser(getState())) return
  try {
    await dispatch(studyApi.endpoints.saveStudyGoals.initiate({ goals: getState().study.goals })).unwrap()
    dispatch(setSyncError(null))
  } catch {
    dispatch(setSyncError(SAVE_FAILED))
  }
}

export const addGoalAndSave =
  (goal: StudyGoal): AppThunk<Promise<void>> =>
  async (dispatch) => {
    dispatch(addGoal(goal))
    await dispatch(saveGoals())
  }

export const toggleGoalAndSave =
  (id: string): AppThunk<Promise<void>> =>
  async (dispatch) => {
    dispatch(toggleGoal(id))
    await dispatch(saveGoals())
  }

export const removeGoalAndSave =
  (id: string): AppThunk<Promise<void>> =>
  async (dispatch) => {
    dispatch(removeGoal(id))
    await dispatch(saveGoals())
  }
