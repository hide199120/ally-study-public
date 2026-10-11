import { daysUntil, formatClock, formatElapsed, formatMinutes, weekDateKeys } from './time'

describe('time', () => {
  it('週は月曜はじまりで7日分', () => {
    // 2026-10-14 は水曜日
    expect(weekDateKeys(new Date(2026, 9, 14, 15))).toEqual([
      '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
    ])
    // 日曜日は、その前の月曜からの週に入る
    expect(weekDateKeys(new Date(2026, 9, 18))[0]).toBe('2026-10-12')
  })

  it('あと何日かを数える（今日は0、過ぎたらマイナス）', () => {
    const today = new Date(2026, 9, 12, 23, 59)
    expect(daysUntil('2026-10-12', today)).toBe(0)
    expect(daysUntil('2026-10-20', today)).toBe(8)
    expect(daysUntil('2026-10-10', today)).toBe(-2)
  })

  it('分を時間と分で表す', () => {
    expect(formatMinutes(0)).toBe('0分')
    expect(formatMinutes(25)).toBe('25分')
    expect(formatMinutes(120)).toBe('2時間')
    expect(formatMinutes(85)).toBe('1時間25分')
  })

  it('タイマーの表示：残りは切り上げ、経過は切り捨て', () => {
    expect(formatClock(25 * 60_000)).toBe('25:00')
    expect(formatClock(1)).toBe('00:01')
    expect(formatClock(3_723_000)).toBe('1:02:03')
    expect(formatElapsed(59_999)).toBe('00:59')
  })
})
