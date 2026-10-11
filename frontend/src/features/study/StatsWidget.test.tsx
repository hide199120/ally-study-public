import { act, screen, waitFor } from '@testing-library/react'
import { jsonResponse, mockApi, renderWithStore } from '../../test/utils'
import StatsWidget from './StatsWidget'
import { addMinutes } from './studySlice'

const me = { id: 1, username: 'ally_user', createdAt: '2026-10-03T00:00:00Z' }

describe('StatsWidget', () => {
  beforeEach(() => {
    // Date だけ固定する（setTimeout などは本物のまま）
    jest.useFakeTimers({ doNotFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'nextTick', 'queueMicrotask'] })
    jest.setSystemTime(new Date(2026, 9, 14, 10)) // 水曜日
  })
  afterEach(() => jest.useRealTimers())

  it('今日と今週の合計、目標までの残りを出す', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(401) })
    const { store } = renderWithStore(<StatsWidget />)
    act(() => {
      store.dispatch(addMinutes({ date: '2026-10-12', minutes: 60 })) // 月曜
      store.dispatch(addMinutes({ date: '2026-10-14', minutes: 85 })) // 今日
      store.dispatch(addMinutes({ date: '2026-10-05', minutes: 300 })) // 先週（数えない）
    })

    expect(screen.getByText('今日の勉強時間').parentElement).toHaveTextContent('1時間25分')
    expect(screen.getByText('2時間25分')).toBeInTheDocument()
    expect(screen.getByText('あと 7時間35分')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '24')
    expect(screen.getByText('ログインすると記録が保存されます')).toBeInTheDocument()
    // グラフの読み上げ用の表
    expect(screen.getByRole('row', { name: '10/14（水） 1時間25分' })).toBeInTheDocument()
  })

  it('週の目標を時間で変えると、ログイン中は保存する', async () => {
    const { requests } = mockApi({
      'GET /api/me': () => jsonResponse(200, me),
      'PUT /api/me/study/settings': () => jsonResponse(200, { weeklyGoalMinutes: 450 }),
    })
    const { store, user } = renderWithStore(<StatsWidget />)
    await waitFor(() => expect(screen.queryByText('ログインすると記録が保存されます')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: '目標を変更' }))
    const input = screen.getByRole('spinbutton', { name: '週の目標（時間）' })
    await user.clear(input)
    await user.type(input, '7.5')
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(store.getState().study.weeklyGoalMinutes).toBe(450)
    await waitFor(() => expect(requests.some((r) => r.method === 'PUT')).toBe(true))
    expect(await requests.find((r) => r.method === 'PUT')!.json()).toEqual({ weeklyGoalMinutes: 450 })
  })
})
