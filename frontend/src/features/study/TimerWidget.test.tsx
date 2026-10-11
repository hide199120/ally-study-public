import { act, fireEvent, screen } from '@testing-library/react'
import { jsonResponse, mockApi, renderWithStore } from '../../test/utils'
import TimerWidget from './TimerWidget'

// 実際の音は鳴らさない
jest.mock('./chime', () => ({ unlockChime: jest.fn(), playChime: jest.fn() }))

const MIN = 60_000
const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms)
  })
}

describe('TimerWidget', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 9, 12, 10, 0, 0))
    mockApi({ 'GET /api/me': () => jsonResponse(401) })
  })
  afterEach(() => jest.useRealTimers())

  it('ポモドーロ：25分たつと記録して休憩に入る', async () => {
    const { store } = renderWithStore(<TimerWidget />)
    expect(screen.getByRole('timer')).toHaveTextContent('25:00')

    fireEvent.click(screen.getByRole('button', { name: '開始' }))
    await advance(10 * MIN)
    expect(screen.getByRole('timer')).toHaveTextContent('15:00')

    await advance(15 * MIN)
    expect(screen.getByText('休憩')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('25分を記録しました')
    expect(store.getState().study.days['2026-10-12']).toBe(25)
    expect(screen.getByRole('button', { name: '休憩をスキップ' })).toBeInTheDocument()
  })

  it('一時停止すると時間が止まる', async () => {
    renderWithStore(<TimerWidget />)
    fireEvent.click(screen.getByRole('button', { name: '開始' }))
    await advance(MIN)
    fireEvent.click(screen.getByRole('button', { name: '一時停止' }))
    await advance(5 * MIN)
    expect(screen.getByRole('timer')).toHaveTextContent('24:00')
    expect(screen.getByRole('button', { name: '再開' })).toBeInTheDocument()
  })

  it('ストップウォッチ：「記録して終了」で経過した分を記録する', async () => {
    const { store } = renderWithStore(<TimerWidget />)
    fireEvent.click(screen.getByRole('radio', { name: 'ストップウォッチ' }))
    fireEvent.click(screen.getByRole('button', { name: '開始' }))
    await advance(3 * MIN + 20_000)
    expect(screen.getByRole('timer')).toHaveTextContent('03:20')

    fireEvent.click(screen.getByRole('button', { name: '記録して終了' }))
    expect(store.getState().study.days['2026-10-12']).toBe(3)
    expect(screen.getByRole('status')).toHaveTextContent('3分を記録しました')
    expect(screen.getByRole('timer')).toHaveTextContent('00:00')
  })

  it('ストップウォッチ：1分未満は記録しない', async () => {
    const { store } = renderWithStore(<TimerWidget />)
    fireEvent.click(screen.getByRole('radio', { name: 'ストップウォッチ' }))
    fireEvent.click(screen.getByRole('button', { name: '開始' }))
    await advance(30_000)
    fireEvent.click(screen.getByRole('button', { name: '記録して終了' }))
    expect(store.getState().study.days).toEqual({})
    expect(screen.getByRole('status')).toHaveTextContent('1分未満は記録されません')
  })

  it('動いている間は種類を切り替えられない', () => {
    renderWithStore(<TimerWidget />)
    fireEvent.click(screen.getByRole('button', { name: '開始' }))
    expect(screen.getByRole('radio', { name: 'ストップウォッチ' })).toBeDisabled()
  })
})
