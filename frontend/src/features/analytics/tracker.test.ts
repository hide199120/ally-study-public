import { createTracker, type TrackerDeps } from './tracker'

function setup(overrides: Partial<TrackerDeps> = {}) {
  const fetchMock = jest.fn().mockResolvedValue(new Response(null, { status: 204 }))
  const timers: (() => void)[] = []
  const store = new Map<string, string>()
  const tracker = createTracker({
    fetch: fetchMock,
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) },
    randomId: () => '8f14e45f-ceea-467e-a2b3-0e5d1c3a9b71',
    isMobile: () => false,
    setTimeout: (fn) => timers.push(fn),
    clearTimeout: () => {},
    endpoint: 'http://localhost/api/analytics/events',
    ...overrides,
  })
  const sentBodies = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body))
  return { tracker, fetchMock, timers, store, sentBodies }
}

describe('tracker', () => {
  it('有効にするまでは何も記録しない', () => {
    const { tracker } = setup()
    tracker.track('page_view')
    expect(tracker.queued).toHaveLength(0)
  })

  it('ためたイベントを、時間がたったらまとめて1回で送る', () => {
    const { tracker, fetchMock, timers, sentBodies } = setup()
    tracker.enable()
    tracker.track('page_view', { source: 'x' })
    tracker.track('sound_play', { soundId: 'rain' })
    expect(fetchMock).not.toHaveBeenCalled()

    timers[0]()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sentBodies()[0]).toEqual({
      anonymousId: '8f14e45f-ceea-467e-a2b3-0e5d1c3a9b71',
      device: 'pc',
      events: [
        { name: 'page_view', properties: { source: 'x' } },
        { name: 'sound_play', properties: { soundId: 'rain' } },
      ],
    })
    const init = fetchMock.mock.calls[0][1]
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('20件たまったら待たずに送る', () => {
    const { tracker, fetchMock, sentBodies } = setup()
    tracker.enable()
    for (let i = 0; i < 20; i++) tracker.track('theme_change')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sentBodies()[0].events).toHaveLength(20)
  })

  it('画面を閉じるときは keepalive を付けて送る', () => {
    const { tracker, fetchMock } = setup()
    tracker.enable()
    tracker.track('page_leave', { durationSec: 60 })
    tracker.flush({ keepalive: true })
    expect(fetchMock.mock.calls[0][1].keepalive).toBe(true)
  })

  it('匿名IDは保存して、次からも同じものを使う', () => {
    const { tracker, store } = setup()
    expect(tracker.getAnonymousId()).toBe('8f14e45f-ceea-467e-a2b3-0e5d1c3a9b71')
    expect(store.get('ally-study:anonymous-id')).toBe('8f14e45f-ceea-467e-a2b3-0e5d1c3a9b71')

    const saved = '11111111-2222-4333-8444-555555555555'
    const other = setup({ randomId: () => 'unused' })
    other.store.set('ally-study:anonymous-id', saved)
    expect(other.tracker.getAnonymousId()).toBe(saved)
  })

  it('保存できない環境でも動く', () => {
    const { tracker } = setup({
      storage: {
        getItem: () => {
          throw new Error('blocked')
        },
        setItem: () => {
          throw new Error('blocked')
        },
      },
    })
    expect(tracker.getAnonymousId()).toBe('8f14e45f-ceea-467e-a2b3-0e5d1c3a9b71')
  })

  it('エラーは1ページで5件まで', () => {
    const { tracker } = setup()
    tracker.enable()
    for (let i = 0; i < 8; i++) tracker.track('client_error', { message: 'x' })
    expect(tracker.queued).toHaveLength(5)
  })

  it('送信に失敗しても例外を投げない', async () => {
    const { tracker } = setup({ fetch: jest.fn().mockRejectedValue(new Error('offline')) })
    tracker.enable()
    tracker.track('page_view')
    expect(() => tracker.flush()).not.toThrow()
  })

  it('スマホなら device を mobile にする', () => {
    const { tracker, sentBodies } = setup({ isMobile: () => true })
    tracker.enable()
    tracker.track('page_view')
    tracker.flush()
    expect(sentBodies()[0].device).toBe('mobile')
  })
})
