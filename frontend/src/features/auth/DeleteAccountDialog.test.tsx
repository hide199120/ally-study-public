import { screen, waitFor } from '@testing-library/react'
import { jsonResponse, mockApi, renderWithStore } from '../../test/utils'
import AccountWidget from './AccountWidget'

const me = { id: 1, username: 'ally_user', createdAt: '2026-10-03T00:00:00Z' }

describe('退会', () => {
  it('パスワードを入れて退会すると、ログアウトした表示に戻る', async () => {
    let deleted = false
    const { requests } = mockApi({
      'GET /api/me': () => (deleted ? jsonResponse(401) : jsonResponse(200, me)),
      'DELETE /api/me': () => {
        deleted = true
        return new Response(null, { status: 204 })
      },
    })
    const { user } = renderWithStore(<AccountWidget />)
    await user.click(await screen.findByRole('button', { name: '退会する' }))

    const submit = screen.getByRole('button', { name: 'すべて削除して退会する' })
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('確認のため、パスワードを入力してください'), 'password1234')
    await user.click(submit)

    await waitFor(() => expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument())
    const del = requests.find((r) => r.method === 'DELETE')!
    expect(await del.json()).toEqual({ password: 'password1234' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('パスワードが違えばエラーを出して、ダイアログは閉じない', async () => {
    mockApi({
      'GET /api/me': () => jsonResponse(200, me),
      'DELETE /api/me': () => jsonResponse(400, { code: 'wrong_password', message: 'パスワードが正しくありません' }),
    })
    const { user } = renderWithStore(<AccountWidget />)
    await user.click(await screen.findByRole('button', { name: '退会する' }))
    await user.type(screen.getByLabelText('確認のため、パスワードを入力してください'), 'nope')
    await user.click(screen.getByRole('button', { name: 'すべて削除して退会する' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('パスワードが正しくありません')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
