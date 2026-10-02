import { screen } from '@testing-library/react'
import { jsonResponse, mockApi, renderWithStore } from '../../test/utils'
import AccountWidget from './AccountWidget'

const user = { id: 1, username: 'ally_user', createdAt: '2026-10-03T00:00:00Z' }

describe('AccountWidget', () => {
  it('未ログインなら「ログイン」と「新規登録」ボタンを表示する', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(401, { code: 'unauthorized', message: 'ログインしてください' }) })
    renderWithStore(<AccountWidget />)

    expect(await screen.findByRole('button', { name: 'ログイン' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新規登録' })).toBeInTheDocument()
  })

  it('ログイン中ならユーザー名を表示する', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, user) })
    renderWithStore(<AccountWidget />)

    expect(await screen.findByText('ally_user')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ログイン' })).not.toBeInTheDocument()
  })

  it('「新規登録」を押すと、新規登録タブでダイアログが開く', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(401) })
    const { store, user: u } = renderWithStore(<AccountWidget />)

    await u.click(await screen.findByRole('button', { name: '新規登録' }))

    expect(store.getState().authDialog).toEqual({ isOpen: true, mode: 'signup' })
  })

  it('ログアウトすると、ログインボタンの表示に戻る', async () => {
    let loggedIn = true
    const { requests } = mockApi({
      'GET /api/me': () => (loggedIn ? jsonResponse(200, user) : jsonResponse(401)),
      'POST /api/auth/logout': () => {
        loggedIn = false
        return new Response(null, { status: 204 })
      },
    })
    const { user: u } = renderWithStore(<AccountWidget />)

    await u.click(await screen.findByRole('button', { name: 'ログアウト' }))

    expect(await screen.findByRole('button', { name: 'ログイン' })).toBeInTheDocument()
    expect(requests.some((r) => r.method === 'POST' && r.url.endsWith('/api/auth/logout'))).toBe(true)
  })
})
