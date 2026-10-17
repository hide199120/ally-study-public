import { dateRange, summarize } from './summarize'

describe('summarize', () => {
  it('日別の値を作り、記録がない日は 0 で埋める', () => {
    const s = summarize(
      [
        { date: '2026-10-01', name: 'page_view', events: 10, visitors: 4, durationSec: 0 },
        { date: '2026-10-01', name: 'page_leave', events: 4, visitors: 4, durationSec: 4 * 30 * 60 },
        { date: '2026-10-03', name: 'page_view', events: 3, visitors: 2, durationSec: 0 },
        { date: '2026-10-03', name: 'sound_play', events: 5, visitors: 2, durationSec: 0 },
        { date: '2026-10-03', name: 'sound_stop', events: 2, visitors: 2, durationSec: 2 * 15 * 60 },
      ],
      '2026-10-01',
      '2026-10-03',
    )
    expect(s.visitors).toEqual([
      { date: '2026-10-01', value: 4 },
      { date: '2026-10-02', value: 0 },
      { date: '2026-10-03', value: 2 },
    ])
    expect(s.avgStayMinutes.map((p) => p.value)).toEqual([30, 0, 0])
    expect(s.totals).toEqual({ visitorDays: 6, pageViews: 13, avgStayMinutes: 30, soundPlays: 5, avgSoundMinutes: 15, studySessions: 0 })
    expect(s.byEvent[0]).toEqual({ name: 'page_view', events: 13, visitors: 6 })
  })

  it('月をまたぐ日付の一覧', () => {
    expect(dateRange('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'])
  })
})
