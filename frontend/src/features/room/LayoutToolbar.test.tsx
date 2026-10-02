import { screen } from '@testing-library/react'
import { renderWithStore } from '../../test/utils'
import LayoutToolbar from './LayoutToolbar'
import { moveFurniture } from './roomLayoutSlice'

describe('LayoutToolbar', () => {
  it('最初は「模様替え」ボタンだけが出ていて、リセットはできない', () => {
    renderWithStore(<LayoutToolbar />)
    expect(screen.getByRole('button', { name: '模様替え' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: '配置をリセット' })).not.toBeInTheDocument()
  })

  it('「模様替え」を押すと模様替えモードになり、「完了」で終わる', async () => {
    const { user, store } = renderWithStore(<LayoutToolbar />)
    await user.click(screen.getByRole('button', { name: '模様替え' }))
    expect(store.getState().roomLayout.editing).toBe(true)
    expect(screen.getByRole('status')).toHaveTextContent('家具をドラッグして動かせます')

    await user.click(screen.getByRole('button', { name: '完了' }))
    expect(store.getState().roomLayout.editing).toBe(false)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('模様替えモード中は、家具を動かしていればリセットできる', async () => {
    const { user, store } = renderWithStore(<LayoutToolbar />)
    await user.click(screen.getByRole('button', { name: '模様替え' }))
    expect(screen.getByRole('button', { name: '配置をリセット' })).toBeDisabled()

    store.dispatch(moveFurniture({ id: 'bed', offset: { x: 1, z: 0 } }))
    await user.click(await screen.findByRole('button', { name: '配置をリセット' }))
    expect(store.getState().roomLayout.offsets).toEqual({})
  })
})
