import { screen, within } from '@testing-library/react'
import { renderWithStore } from '../../test/utils'
import LayoutPanel from './LayoutPanel'
import { startEditing } from './roomLayoutSlice'

function renderPanel() {
  const result = renderWithStore(<LayoutPanel loggedIn={false} />)
  result.store.dispatch(startEditing())
  return result
}

describe('LayoutPanel', () => {
  it('最初はバッグのタブが開いていて、バッグの中の家具と部屋にある家具が並ぶ', () => {
    renderPanel()
    expect(screen.getByRole('tab', { name: 'バッグ' })).toHaveAttribute('aria-selected', 'true')
    const bag = screen.getByRole('list', { name: 'バッグの中の家具' })
    expect(within(bag).getByRole('button', { name: 'ミニソファを部屋に出す' })).toBeInTheDocument()
    const placed = screen.getByRole('list', { name: '部屋にある家具' })
    expect(within(placed).getByRole('button', { name: 'ベッドをバッグにしまう' })).toBeInTheDocument()
  })

  it('バッグの家具を出すと部屋に移り、しまうとバッグに戻る', async () => {
    const { user, store } = renderPanel()
    await user.click(screen.getByRole('button', { name: 'ギターを部屋に出す' }))
    expect(store.getState().roomLayout.placed.guitar).toBe(true)
    expect(within(screen.getByRole('list', { name: '部屋にある家具' })).getByRole('button', { name: 'ギターをバッグにしまう' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ギターをバッグにしまう' }))
    expect(store.getState().roomLayout.placed.guitar).toBe(false)
    expect(screen.getByRole('button', { name: 'ギターを部屋に出す' })).toBeInTheDocument()
  })

  it('全部出すと「バッグは空っぽです」と表示する', async () => {
    const { user } = renderPanel()
    for (const name of ['本棚', 'ミニソファ', 'ビーズクッション', 'ローテーブル', 'フロアランプ', 'ギター', '金魚鉢', 'サボテン']) {
      await user.click(screen.getByRole('button', { name: `${name}を部屋に出す` }))
    }
    expect(screen.getByText('バッグは空っぽです')).toBeInTheDocument()
  })

  it('壁紙タブで壁紙を選べる', async () => {
    const { user, store } = renderPanel()
    await user.click(screen.getByRole('tab', { name: '壁紙' }))
    expect(screen.getByRole('radio', { name: '若草' })).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByRole('radio', { name: '星空' }))
    expect(store.getState().roomLayout.wallpaper).toBe('night')
    expect(screen.getByRole('radio', { name: '星空' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '若草' })).toHaveAttribute('aria-checked', 'false')
  })

  it('住人タブで女の子と男の子を切り替えられる', async () => {
    const { user, store } = renderPanel()
    await user.click(screen.getByRole('tab', { name: '住人' }))
    await user.click(screen.getByRole('radio', { name: '男の子' }))
    expect(store.getState().roomLayout.avatar).toBe('boy')
    await user.click(screen.getByRole('radio', { name: '女の子' }))
    expect(store.getState().roomLayout.avatar).toBe('girl')
  })
})
