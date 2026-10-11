import type { StudyDay, StudyGoal, StudyOverview, StudySessionInput } from '../../api/types'
import { authApi } from '../auth/authApi'

/** 学習記録のAPI。部屋と同じく、認証の API スライスにエンドポイントを追加する */
export const studyApi = authApi.injectEndpoints({
  endpoints: (builder) => ({
    /** 引数のユーザーIDは、キャッシュをユーザーごとに分けるためだけに使う */
    getStudy: builder.query<StudyOverview, number>({
      query: () => '/me/study',
      providesTags: ['Study'],
    }),
    addStudySession: builder.mutation<StudyDay, StudySessionInput>({
      query: (body) => ({ url: '/me/study/sessions', method: 'POST', body }),
    }),
    saveStudySettings: builder.mutation<{ weeklyGoalMinutes: number }, { weeklyGoalMinutes: number }>({
      query: (body) => ({ url: '/me/study/settings', method: 'PUT', body }),
    }),
    saveStudyGoals: builder.mutation<{ goals: StudyGoal[] }, { goals: StudyGoal[] }>({
      query: (body) => ({ url: '/me/study/goals', method: 'PUT', body }),
    }),
  }),
})

export const { useGetStudyQuery } = studyApi
