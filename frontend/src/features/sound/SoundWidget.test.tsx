import { fireEvent, screen } from '@testing-library/react'
import { renderWithStore } from '../../test/utils'
import SoundWidget from './SoundWidget'
import { soundEngine } from './engine'

// 実際の音は鳴らさず、エンジンに何を渡したかだけ確認する
jest.mock('./engine', () => ({ soundEngine: { unlock: jest.fn(), sync: jest.fn() } }))
const sync = soundEngine.sync as jest.Mock

/** 最後に sync で「鳴らす」と指示された音 */
const lastPlaying = () =>
  (sync.mock.calls.at(-1)?.[0] as { id: string; playing: boolean }[]).filter((t) => t.playing).map((t) => t.id)

describe('SoundWidget', () => {
  beforeEach(() => sync.mockClear())

  it('最初は Lo-fi room が選ばれていて、鳴っていない', () => {
    renderWithStore(<SoundWidget />)
    expect(screen.getByText('Lo-fi room')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '再生' })).toBeInTheDocument()
    expect(lastPlaying()).toEqual([])
  })

  it('再生ボタンで鳴らし、もう一度押すと一時停止する', async () => {
    const { user } = renderWithStore(<SoundWidget />)
    await user.click(screen.getByRole('button', { name: '再生' }))
    expect(soundEngine.unlock).toHaveBeenCalled()
    expect(lastPlaying()).toEqual(['lofiRoom'])

    await user.click(screen.getByRole('button', { name: '一時停止' }))
    expect(lastPlaying()).toEqual([])
  })

  it('パネルを開いて雨を選ぶと、BGMと雨が一緒に鳴る', async () => {
    const { user } = renderWithStore(<SoundWidget />)
    await user.click(screen.getByRole('button', { name: '音を選ぶ' }))
    await user.click(screen.getByRole('button', { name: /雨/ }))

    expect(screen.getByRole('button', { name: /雨/ })).toHaveAttribute('aria-pressed', 'true')
    expect(lastPlaying()).toEqual(['lofiRoom', 'rain'])
    expect(screen.getByText('Lo-fi room + 雨')).toBeInTheDocument()
  })

  it('別のBGMを選ぶと、BGMが切り替わる', async () => {
    const { user } = renderWithStore(<SoundWidget />)
    await user.click(screen.getByRole('button', { name: '音を選ぶ' }))
    await user.click(screen.getByRole('button', { name: /ピアノ/ }))

    expect(lastPlaying()).toEqual(['piano'])
    expect(screen.getByRole('button', { name: /Lo-fi room/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('音量スライダーで音量を変えられる', async () => {
    const { user, store } = renderWithStore(<SoundWidget />)
    await user.click(screen.getByRole('button', { name: '音を選ぶ' }))
    await user.click(screen.getByRole('button', { name: /焚き火/ }))
    // range 入力は user-event では動かせないので、change イベントを直接送る
    fireEvent.change(screen.getByRole('slider', { name: '焚き火の音量' }), { target: { value: '0.25' } })
    expect(store.getState().sound.tracks.fire.volume).toBe(0.25)
  })

  it('「すべて止める」で全部オフになる', async () => {
    const { user } = renderWithStore(<SoundWidget />)
    await user.click(screen.getByRole('button', { name: '音を選ぶ' }))
    await user.click(screen.getByRole('button', { name: /雨/ }))
    await user.click(screen.getByRole('button', { name: 'すべて止める' }))
    expect(lastPlaying()).toEqual([])
    expect(screen.getByText('音を選んでください')).toBeInTheDocument()
  })

  it('Esc でパネルを閉じる', async () => {
    const { user } = renderWithStore(<SoundWidget />)
    await user.click(screen.getByRole('button', { name: '音を選ぶ' }))
    expect(screen.getByRole('region', { name: '音を選ぶ' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: '音を選ぶ' })).not.toBeInTheDocument()
  })
})
