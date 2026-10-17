import { startPageTracking, trafficSource } from './pageTracking'
import type { Tracker } from './tracker'

describe('trafficSource', () => {
  it.each([
    ['?utm_source=Zenn', '', { source: 'zenn' }],
    ['', '', { source: 'direct' }],
    ['', 'https://ally-study.onrender.com/', { source: 'direct' }],
    ['', 'https://t.co/abc', { source: 'x', referrer: 't.co' }],
    ['', 'https://x.com/someone', { source: 'x', referrer: 'x.com' }],
    ['', 'https://zenn.dev/articles/1', { source: 'zenn', referrer: 'zenn.dev' }],
    ['', 'https://www.google.co.jp/', { source: 'search', referrer: 'www.google.co.jp' }],
    ['', 'https://example.com/', { source: 'other', referrer: 'example.com' }],
    ['', 'not a url', { source: 'direct' }],
  ])('search=%s referrer=%s', (search, referrer, want) => {
    expect(trafficSource(search, referrer, 'ally-study.onrender.com')).toEqual(want)
  })
})

describe('startPageTracking', () => {
  function fakeTracker() {
    const track = jest.fn()
    const flush = jest.fn()
    return { tracker: { track, flush } as unknown as Tracker, track, flush }
  }

  it('開いたら page_view、閉じたら滞在秒数つきの page_leave を記録する', () => {
    const { tracker, track, flush } = fakeTracker()
    let now = 1_000_000
    const beforeLeave = jest.fn()
    const stop = startPageTracking({ tracker, now: () => now, beforeLeave })

    expect(track).toHaveBeenCalledWith('page_view', { source: 'direct' })
    expect(flush).toHaveBeenCalledTimes(1)

    now += 25 * 60 * 1000
    window.dispatchEvent(new Event('pagehide'))
    expect(beforeLeave).toHaveBeenCalled()
    expect(track).toHaveBeenLastCalledWith('page_leave', { durationSec: 1500 })
    expect(flush).toHaveBeenLastCalledWith({ keepalive: true })

    // 2回目の pagehide では記録しない
    window.dispatchEvent(new Event('pagehide'))
    expect(track.mock.calls.filter(([name]) => name === 'page_leave')).toHaveLength(1)
    stop()
  })

  it('画面のエラーを記録する', () => {
    const { tracker, track } = fakeTracker()
    const stop = startPageTracking({ tracker, now: () => 0 })
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom' }))
    expect(track).toHaveBeenCalledWith('client_error', { message: 'boom' })
    stop()
  })
})
