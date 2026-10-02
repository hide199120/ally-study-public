import { act, screen, waitFor } from '@testing-library/react'
import { jsonResponse, mockApi, renderWithStore } from '../../test/utils'
import AuthDialog from './AuthDialog'
import { openAuthDialog } from './authDialogSlice'

const user = { id: 1, username: 'ally_user', createdAt: '2026-10-03T00:00:00Z' }

function renderOpenedDialog(mode: 'login' | 'signup') {
  const result = renderWithStore(<AuthDialog />)
  act(() => {
    result.store.dispatch(openAuthDialog(mode))
  })
  return result
}

describe('AuthDialog', () => {
  it('閉じているときは何も表示しない', () => {
    renderWithStore(<AuthDialog />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ログインに成功するとダイアログが閉じる', async () => {
    const { requests } = mockApi({
      'POST /api/auth/login': () => jsonResponse(200, user),
      'GET /api/me': () => jsonResponse(200, user),
    })
    const { user: u } = renderOpenedDialog('login')

    await u.type(await screen.findByLabelText('ユーザー名'), 'ally_user')
    await u.type(screen.getByLabelText('パスワード'), 'password1234')
    await u.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const login = requests.find((r) => r.url.endsWith('/api/auth/login'))!
    expect(await login.json()).toEqual({ username: 'ally_user', password: 'password1234' })
  })

  it('ログインに失敗すると、APIのエラーメッセージを表示する', async () => {
    mockApi({
      'POST /api/auth/login': () =>
        jsonResponse(401, { code: 'invalid_credentials', message: 'ユーザー名またはパスワードが正しくありません' }),
    })
    const { user: u } = renderOpenedDialog('login')

    await u.type(await screen.findByLabelText('ユーザー名'), 'ally_user')
    await u.type(screen.getByLabelText('パスワード'), 'wrong-password')
    await u.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ユーザー名またはパスワードが正しくありません')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('新規登録でユーザー名が重複していたら、そのメッセージを表示する', async () => {
    mockApi({
      'POST /api/auth/signup': () =>
        jsonResponse(409, { code: 'username_taken', message: 'このユーザー名はすでに使われています' }),
    })
    const { user: u } = renderOpenedDialog('signup')

    await u.type(await screen.findByLabelText('ユーザー名'), 'ally_user')
    await u.type(screen.getByLabelText('パスワード'), 'password1234')
    await u.click(screen.getByRole('button', { name: '登録してはじめる' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('このユーザー名はすでに使われています')
  })

  it('タブを切り替えると、入力内容がリセットされる', async () => {
    const { user: u } = renderOpenedDialog('login')

    await u.type(await screen.findByLabelText('ユーザー名'), 'ally_user')
    await u.click(screen.getByRole('tab', { name: '新規登録' }))

    expect(screen.getByRole('tab', { name: '新規登録' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('ユーザー名')).toHaveValue('')
  })

  it('Escキーで閉じる', async () => {
    const { user: u } = renderOpenedDialog('login')
    await screen.findByRole('dialog')

    await u.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
