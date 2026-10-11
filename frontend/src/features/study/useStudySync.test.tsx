import { act, waitFor } from '@testing-library/react'
import { authApi } from '../auth/authApi'
import { jsonResponse, mockApi, renderWithStore } from '../../test/utils'
import { useStudySync } from './useStudySync'

const me = { id: 1, username: 'ally_user', createdAt: '2026-10-03T00:00:00Z' }
const overview = {
  weeklyGoalMinutes: 300,
  goals: [{ id: 'g1', kind: 'certification', title: '基本情報', dueDate: '2026-11-01', done: false }],
  days: [{ date: '2026-10-12', minutes: 50 }],
}

function Sync() {
  useStudySync()
  return null
}

describe('useStudySync', () => {
  it('ログイン中ならサーバーの学習記録を読み込む', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, me), 'GET /api/me/study': () => jsonResponse(200, overview) })
    const { store } = renderWithStore(<Sync />)
    await waitFor(() => expect(store.getState().study.weeklyGoalMinutes).toBe(300))
    expect(store.getState().study.days).toEqual({ '2026-10-12': 50 })
    expect(store.getState().study.goals).toHaveLength(1)
  })

  it('未ログインなら取りに行かない', async () => {
    const { requests } = mockApi({ 'GET /api/me': () => jsonResponse(401) })
    renderWithStore(<Sync />)
    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests.some((r) => r.url.endsWith('/api/me/study'))).toBe(false)
  })

  it('ログアウトしたら記録を消す', async () => {
    let loggedIn = true
    mockApi({
      'GET /api/me': () => (loggedIn ? jsonResponse(200, me) : jsonResponse(401)),
      'GET /api/me/study': () => jsonResponse(200, overview),
      'POST /api/auth/logout': () => {
        loggedIn = false
        return new Response(null, { status: 204 })
      },
    })
    const { store } = renderWithStore(<Sync />)
    await waitFor(() => expect(store.getState().study.goals).toHaveLength(1))

    await act(() => store.dispatch(authApi.endpoints.logout.initiate()))
    await waitFor(() => expect(store.getState().study.goals).toEqual([]))
    expect(store.getState().study.days).toEqual({})
  })
})
