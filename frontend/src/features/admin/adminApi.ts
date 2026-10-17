import type { AnalyticsDaily } from '../../api/types'
import { authApi } from '../auth/authApi'

/** 管理者向けのアクセス解析の API。管理者でなければ 404 が返る */
export const adminApi = authApi.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsDaily: builder.query<AnalyticsDaily, { from: string; to: string }>({
      query: ({ from, to }) => ({ url: '/admin/analytics/daily', params: { from, to } }),
    }),
  }),
})

export const { useGetAnalyticsDailyQuery } = adminApi

/** 生ログ（JSON Lines）を書き出す URL。リンクを開くとファイルとしてダウンロードされる */
export function exportUrl(from: string, to: string): string {
  const params = new URLSearchParams({ from, to })
  return `${window.location.origin}/api/admin/analytics/export?${params}`
}
