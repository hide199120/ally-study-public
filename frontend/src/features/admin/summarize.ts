import type { AnalyticsDailyRow, AnalyticsEventName } from '../../api/types'

export type DayPoint = { date: string; value: number }

export type Summary = {
  /** 日ごとの訪問人数（page_view の人数） */
  visitors: DayPoint[]
  /** 日ごとの平均滞在時間（分）。閉じた記録がない日は 0 */
  avgStayMinutes: DayPoint[]
  totals: {
    /** 日ごとの訪問人数の合計（同じ人が別の日に来たら2人と数える） */
    visitorDays: number
    pageViews: number
    avgStayMinutes: number
    soundPlays: number
    avgSoundMinutes: number
    studySessions: number
  }
  /** イベントごとの件数（多い順） */
  byEvent: { name: AnalyticsEventName; events: number; visitors: number }[]
}

/** from〜to（YYYY-MM-DD、両端を含む）の日付の一覧 */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = []
  const d = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  while (d <= end && out.length < 400) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

const minutes = (sec: number, count: number) => (count > 0 ? Math.round((sec / count / 60) * 10) / 10 : 0)

/** API の日別の集計から、グラフと数字のタイルに使う値を作る。記録がない日は 0 で埋める */
export function summarize(rows: AnalyticsDailyRow[], from: string, to: string): Summary {
  const dates = dateRange(from, to)
  const pick = (name: AnalyticsEventName) => {
    const m = new Map<string, AnalyticsDailyRow>()
    for (const r of rows) if (r.name === name) m.set(r.date, r)
    return m
  }
  const views = pick('page_view')
  const leaves = pick('page_leave')

  const sum = (name: AnalyticsEventName, key: 'events' | 'visitors' | 'durationSec') =>
    rows.filter((r) => r.name === name).reduce((acc, r) => acc + r[key], 0)

  const byName = new Map<AnalyticsEventName, { events: number; visitors: number }>()
  for (const r of rows) {
    const cur = byName.get(r.name) ?? { events: 0, visitors: 0 }
    cur.events += r.events
    cur.visitors += r.visitors
    byName.set(r.name, cur)
  }

  return {
    visitors: dates.map((date) => ({ date, value: views.get(date)?.visitors ?? 0 })),
    avgStayMinutes: dates.map((date) => {
      const r = leaves.get(date)
      return { date, value: r ? minutes(r.durationSec, r.events) : 0 }
    }),
    totals: {
      visitorDays: sum('page_view', 'visitors'),
      pageViews: sum('page_view', 'events'),
      avgStayMinutes: minutes(sum('page_leave', 'durationSec'), sum('page_leave', 'events')),
      soundPlays: sum('sound_play', 'events'),
      avgSoundMinutes: minutes(sum('sound_stop', 'durationSec'), sum('sound_stop', 'events')),
      studySessions: sum('study_session', 'events'),
    },
    byEvent: [...byName.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.events - a.events),
  }
}
