import { act, screen, waitFor, within } from '@testing-library/react'
import { jsonResponse, mockApi, renderWithStore } from '../../test/utils'
import GoalsWidget from './GoalsWidget'
import { loadStudy } from './studySlice'

const me = { id: 1, username: 'ally_user', createdAt: '2026-10-03T00:00:00Z' }

describe('GoalsWidget', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'nextTick', 'queueMicrotask'] })
    jest.setSystemTime(new Date(2026, 9, 12, 10))
  })
  afterEach(() => jest.useRealTimers())

  it('資格は試験までの日数を出し、未完了・日付が近い順に並べる', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(401) })
    const { store } = renderWithStore(<GoalsWidget />)
    act(() => {
      store.dispatch(
        loadStudy({
          weeklyGoalMinutes: 600,
          days: [],
          goals: [
            { id: 'a', kind: 'task', title: '参考書を読む', done: true },
            { id: 'b', kind: 'certification', title: '基本情報技術者', dueDate: '2026-10-25', done: false },
            { id: 'c', kind: 'task', title: 'ポートフォリオ', dueDate: '2026-10-15', done: false },
          ],
        }),
      )
    })

    const items = await screen.findAllByRole('listitem')
    expect(items.map((li) => within(li).getByText(/参考書|基本情報|ポートフォリオ/).textContent)).toEqual([
      'ポートフォリオ',
      '基本情報技術者',
      '参考書を読む',
    ])
    expect(within(items[0]).getByText('期限 10/15（あと3日）')).toBeInTheDocument()
    expect(within(items[1]).getByText('試験まで あと13日（10/25）')).toBeInTheDocument()
    expect(within(items[2]).getByRole('checkbox')).toBeChecked()
  })

  it('追加・完了・削除をすると、ログイン中は一覧ごと保存する', async () => {
    const { requests } = mockApi({
      'GET /api/me': () => jsonResponse(200, me),
      'PUT /api/me/study/goals': () => jsonResponse(200, { goals: [] }),
    })
    const { store, user } = renderWithStore(<GoalsWidget />)
    await waitFor(() => expect(screen.queryByText('ログインすると目標が保存されます')).not.toBeInTheDocument())

    await user.type(screen.getByRole('textbox', { name: '目標の名前' }), '  応用情報  ')
    await user.type(screen.getByLabelText('試験日'), '2027-04-19')
    await user.click(screen.getByRole('button', { name: '追加' }))

    const goals = store.getState().study.goals
    expect(goals).toHaveLength(1)
    expect(goals[0]).toMatchObject({ kind: 'certification', title: '応用情報', dueDate: '2027-04-19', done: false })
    expect(screen.getByRole('textbox', { name: '目標の名前' })).toHaveValue('')

    await user.click(screen.getByRole('checkbox', { name: '応用情報を完了にする' }))
    expect(store.getState().study.goals[0].done).toBe(true)

    await user.click(screen.getByRole('button', { name: '応用情報を削除' }))
    expect(store.getState().study.goals).toEqual([])
    expect(screen.getByText('まだ目標がありません。下から追加できます')).toBeInTheDocument()

    await waitFor(() => expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(3))
    const last = await requests.filter((r) => r.method === 'PUT')[2].json()
    expect(last).toEqual({ goals: [] })
  })

  it('名前が空なら追加できない', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(401) })
    renderWithStore(<GoalsWidget />)
    expect(screen.getByRole('button', { name: '追加' })).toBeDisabled()
  })
})
