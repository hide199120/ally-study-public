import { act, waitFor } from '@testing-library/react'
import type { Room } from '../../api/types'
import { authApi } from '../auth/authApi'
import { jsonResponse, mockApi, renderWithStore } from '../../test/utils'
import { useRoomSync } from './useRoomSync'

const me = { id: 1, username: 'ally_user', createdAt: '2026-10-03T00:00:00Z' }
const savedRoom: Room = {
  avatar: 'boy',
  wallpaper: 'wood',
  furniture: [
    { id: 'bed', placed: false, x: 0, z: 0 },
    { id: 'sofa', placed: true, x: 0.5, z: 0 },
  ],
}

function Sync() {
  useRoomSync()
  return null
}

describe('useRoomSync', () => {
  it('ログイン中ならサーバーの部屋を読み込む', async () => {
    mockApi({
      'GET /api/me': () => jsonResponse(200, me),
      'GET /api/me/room': () => jsonResponse(200, savedRoom),
    })
    const { store } = renderWithStore(<Sync />)

    await waitFor(() => expect(store.getState().roomLayout.avatar).toBe('boy'))
    const state = store.getState().roomLayout
    expect(state.wallpaper).toBe('wood')
    expect(state.placed.bed).toBe(false)
    expect(state.placed.sofa).toBe(true)
    expect(state.offsets).toEqual({ sofa: { x: 0.5, z: 0 } })
  })

  it('未ログインなら部屋を取りに行かない', async () => {
    const { requests } = mockApi({ 'GET /api/me': () => jsonResponse(401) })
    const { store } = renderWithStore(<Sync />)

    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests.some((r) => r.url.endsWith('/api/me/room'))).toBe(false)
    expect(store.getState().roomLayout.avatar).toBe('girl')
  })

  it('ログアウトしたら初期状態の部屋に戻る', async () => {
    let loggedIn = true
    mockApi({
      'GET /api/me': () => (loggedIn ? jsonResponse(200, me) : jsonResponse(401)),
      'GET /api/me/room': () => jsonResponse(200, savedRoom),
      'POST /api/auth/logout': () => {
        loggedIn = false
        return new Response(null, { status: 204 })
      },
    })
    const { store } = renderWithStore(<Sync />)
    await waitFor(() => expect(store.getState().roomLayout.avatar).toBe('boy'))

    await act(() => store.dispatch(authApi.endpoints.logout.initiate()))

    await waitFor(() => expect(store.getState().roomLayout.avatar).toBe('girl'))
    expect(store.getState().roomLayout.placed.bed).toBe(true)
    expect(store.getState().roomLayout.wallpaper).toBe('meadow')
  })
})
