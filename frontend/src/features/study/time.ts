/* 学習記録で使う、日付と時間の計算（React に依存しない関数だけ） */

const pad = (n: number) => String(n).padStart(2, '0')

/** その日の日付キー（ブラウザのタイムゾーンで YYYY-MM-DD） */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 日付キーを、その日の 0:00（ブラウザのタイムゾーン）の Date にする */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** d を含む週（月曜はじまり）の7日分の日付キー */
export function weekDateKeys(d: Date): string[] {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const fromMonday = (monday.getDay() + 6) % 7 // 月=0 … 日=6
  monday.setDate(monday.getDate() - fromMonday)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return dateKey(day)
  })
}

/** 今日から見て、その日まであと何日か（今日なら 0、過ぎていればマイナス） */
export function daysUntil(targetKey: string, today: Date): number {
  const target = parseDateKey(targetKey)
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - base.getTime()) / 86_400_000)
}

/** 分を「1時間25分」「25分」の形にする */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}時間`
  return `${h}時間${m}分`
}

/** ミリ秒を「24:59」「1:02:03」の形にする（タイマー表示用。切り上げ） */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** ストップウォッチ表示用（切り捨て） */
export function formatElapsed(ms: number): string {
  return formatClock(Math.floor(Math.max(0, ms) / 1000) * 1000)
}
