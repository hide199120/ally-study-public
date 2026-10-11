import { authApi } from '../auth/authApi'
import { makeStore } from '../../app/store'
import { jsonResponse, mockApi } from '../../test/utils'
import { startTimer } from './studySlice'
import { addGoalAndSave, finishPomodoroPhase, recordStudy, toggleGoalAndSave } from './studyThunks'

const me = { id: 1, username: 'ally_user', createdAt: '2026-10-03T00:00:00Z' }
const now = new Date(2026, 9, 12, 10)
const MIN = 60_000

async function loggedInStore(routes: Parameters<typeof mockApi>[0]) {
  const api = mockApi({ 'GET /api/me': () => jsonResponse(200, me), ...routes })
  const store = makeStore()
  await store.dispatch(authApi.endpoints.getMe.initiate())
  return { store, ...api }
}

describe('recordStudy', () => {
  it('未ログインなら画面にだけ足して、サーバーには送らない', async () => {
    const { requests } = mockApi({ 'GET /api/me': () => jsonResponse(401) })
    const store = makeStore()
    await store.dispatch(authApi.endpoints.getMe.initiate())
    await store.dispatch(recordStudy({ minutes: 25, mode: 'pomodoro', now }))

    expect(store.getState().study.days['2026-10-12']).toBe(25)
    expect(requests.some((r) => r.url.includes('/me/study'))).toBe(false)
  })

  it('ログイン中は保存して、返ってきたその日の合計で上書きする', async () => {
    const { store, requests } = await loggedInStore({
      'POST /api/me/study/sessions': () => jsonResponse(201, { date: '2026-10-12', minutes: 70 }),
    })
    await store.dispatch(recordStudy({ minutes: 25, mode: 'pomodoro', now }))

    const post = requests.find((r) => r.method === 'POST')!
    expect(await post.json()).toEqual({ date: '2026-10-12', minutes: 25, mode: 'pomodoro' })
    expect(store.getState().study.days['2026-10-12']).toBe(70)
    expect(store.getState().study.syncError).toBeNull()
  })

  it('保存に失敗したらエラーを出す（画面の記録は残す）', async () => {
    const { store } = await loggedInStore({ 'POST /api/me/study/sessions': () => jsonResponse(500) })
    await store.dispatch(recordStudy({ minutes: 10, mode: 'stopwatch', now }))

    expect(store.getState().study.days['2026-10-12']).toBe(10)
    expect(store.getState().study.syncError).toMatch('保存できませんでした')
  })
})

describe('finishPomodoroPhase', () => {
  it('まだ時間が残っていれば何もしない', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(401) })
    const store = makeStore()
    store.dispatch(startTimer({ now: 0 }))
    await store.dispatch(finishPomodoroPhase(10 * MIN))
    expect(store.getState().study.timer.phase).toBe('focus')
  })

  it('集中が終わったら25分を記録して休憩に入る。2回呼んでも1回分だけ', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(401) })
    const store = makeStore()
    const start = now.getTime()
    store.dispatch(startTimer({ now: start }))
    await store.dispatch(finishPomodoroPhase(start + 25 * MIN))
    await store.dispatch(finishPomodoroPhase(start + 25 * MIN))

    const s = store.getState().study
    expect(s.timer.phase).toBe('break')
    expect(s.notice).toBe('25分を記録しました。休憩しましょう')
    expect(s.days['2026-10-12']).toBe(25)
  })
})

describe('目標の保存', () => {
  it('追加や完了のたびに、一覧ごと PUT する', async () => {
    const bodies: unknown[] = []
    const { store, requests } = await loggedInStore({ 'PUT /api/me/study/goals': () => jsonResponse(200, { goals: [] }) })
    await store.dispatch(addGoalAndSave({ id: 'g1', kind: 'certification', title: '基本情報', dueDate: '2026-11-01', done: false }))
    await store.dispatch(toggleGoalAndSave('g1'))

    for (const r of requests.filter((r) => r.method === 'PUT')) bodies.push(await r.json())
    expect(bodies).toEqual([
      { goals: [{ id: 'g1', kind: 'certification', title: '基本情報', dueDate: '2026-11-01', done: false }] },
      { goals: [{ id: 'g1', kind: 'certification', title: '基本情報', dueDate: '2026-11-01', done: true }] },
    ])
  })
})
