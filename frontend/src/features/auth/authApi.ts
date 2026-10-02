import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { SerializedError } from '@reduxjs/toolkit'
import type { ApiError, Credentials, User } from '../../api/types'

export const authApi = createApi({
  reducerPath: 'authApi',
  // Cookie（session_id）を一緒に送るために credentials: 'include' を指定する
  // 同じオリジンの /api に送る（テスト環境でも動くよう、オリジン付きの絶対URLにしている）
  baseQuery: fetchBaseQuery({ baseUrl: `${window.location.origin}/api`, credentials: 'include' }),
  tagTypes: ['Me'],
  endpoints: (builder) => ({
    // ログイン中のユーザー。未ログイン（401）はエラーではなく null として扱う
    getMe: builder.query<User | null, void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const result = await baseQuery('/me')
        if (result.error?.status === 401) return { data: null }
        if (result.error) return { error: result.error }
        return { data: result.data as User }
      },
      providesTags: ['Me'],
    }),
    signup: builder.mutation<User, Credentials>({
      query: (body) => ({ url: '/auth/signup', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    login: builder.mutation<User, Credentials>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['Me'],
    }),
  }),
})

export const { useGetMeQuery, useSignupMutation, useLoginMutation, useLogoutMutation } = authApi

/** APIのエラーから、画面に表示するメッセージを取り出す */
export function getErrorMessage(error: FetchBaseQueryError | SerializedError | undefined): string | null {
  if (!error) return null
  if ('status' in error && isApiError(error.data)) return error.data.message
  return '通信に失敗しました。時間をおいてもう一度お試しください'
}

function isApiError(data: unknown): data is ApiError {
  return typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
}
