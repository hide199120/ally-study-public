import { screen, waitFor } from '@testing-library/react'
import type { Room } from '../../api/types'
import { jsonResponse, mockApi, renderWithStore } from '../../test/utils'
import LayoutToolbar from './LayoutToolbar'
import { moveFurniture } from './roomLayoutSlice'

const me = { id: 1, username: 'ally_user', createdAt: '2026-10-03T00:00:00Z' }
const loggedOut = () => jsonResponse(401, { code: 'unauthorized', message: 'ログインしてください' })

describe('LayoutToolbar', () => {
  it('最初は「模様替え」ボタンだけが出ていて、パネルもリセットボタンもない', () => {
    mockApi({ 'GET /api/me': loggedOut })
    renderWithStore(<LayoutToolbar />)
    expect(screen.getByRole('button', { name: '模様替え' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('region', { name: '模様替え' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '配置をリセット' })).not.toBeInTheDocument()
  })

  it('「模様替え」を押すとパネルが開き、「完了」で閉じる', async () => {
    mockApi({ 'GET /api/me': loggedOut })
    const { user, store } = renderWithStore(<LayoutToolbar />)
    await user.click(screen.getByRole('button', { name: '模様替え' }))
    expect(store.getState().roomLayout.editing).toBe(true)
    expect(screen.getByRole('region', { name: '模様替え' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '完了' }))
    expect(store.getState().roomLayout.editing).toBe(false)
    expect(screen.queryByRole('region', { name: '模様替え' })).not.toBeInTheDocument()
  })

  it('模様替えモード中は、家具を動かしていればリセットできる', async () => {
    mockApi({ 'GET /api/me': loggedOut })
    const { user, store } = renderWithStore(<LayoutToolbar />)
    await user.click(screen.getByRole('button', { name: '模様替え' }))
    expect(screen.getByRole('button', { name: '配置をリセット' })).toBeDisabled()

    store.dispatch(moveFurniture({ id: 'bed', offset: { x: 1, z: 0 } }))
    await user.click(await screen.findByRole('button', { name: '配置をリセット' }))
    expect(store.getState().roomLayout.offsets).toEqual({})
  })

  it('未ログインなら「完了」を押しても保存しない（ログインを促す）', async () => {
    const { requests } = mockApi({ 'GET /api/me': loggedOut })
    const { user } = renderWithStore(<LayoutToolbar />)
    await user.click(screen.getByRole('button', { name: '模様替え' }))
    expect(await screen.findByText('ログインすると模様替えを保存できます')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '完了' }))
    expect(requests.some((r) => r.method === 'PUT')).toBe(false)
  })

  it('ログイン中なら「完了」で部屋を保存する', async () => {
    const savedRoom: Room = { avatar: 'boy', wallpaper: 'meadow', furniture: [] }
    const { requests } = mockApi({
      'GET /api/me': () => jsonResponse(200, me),
      'PUT /api/me/room': () => jsonResponse(200, savedRoom),
    })
    const { user, store } = renderWithStore(<LayoutToolbar />)
    await user.click(screen.getByRole('button', { name: '模様替え' }))
    expect(await screen.findByText('「完了」を押すと保存されます')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '住人' }))
    await user.click(screen.getByRole('radio', { name: '男の子' }))
    store.dispatch(moveFurniture({ id: 'bed', offset: { x: -0.5, z: 0.3 } }))
    await user.click(screen.getByRole('button', { name: '完了' }))

    expect(await screen.findByRole('status')).toHaveTextContent('模様替えを保存しました')
    const put = requests.find((r) => r.method === 'PUT')
    expect(put?.url).toMatch(/\/api\/me\/room$/)
    const body: Room = await put!.clone().json()
    expect(body.avatar).toBe('boy')
    expect(body.furniture).toContainEqual({ id: 'bed', placed: true, x: -0.5, z: 0.3 })
  })

  it('保存に失敗したらエラーを表示する', async () => {
    mockApi({
      'GET /api/me': () => jsonResponse(200, me),
      'PUT /api/me/room': () => jsonResponse(500, { code: 'internal_error', message: 'サーバーでエラーが発生しました' }),
    })
    const { user } = renderWithStore(<LayoutToolbar />)
    await user.click(screen.getByRole('button', { name: '模様替え' }))
    await screen.findByText('「完了」を押すと保存されます')
    await user.click(screen.getByRole('button', { name: '完了' }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('保存できませんでした'))
  })
})
