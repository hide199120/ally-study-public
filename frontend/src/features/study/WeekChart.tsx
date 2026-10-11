import { useState } from 'react'
import { formatMinutes, parseDateKey } from './time'

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']

// SVG の座標（viewBox）。横幅は親に合わせて伸び縮みする
const W = 260
const H = 150
const PAD = { top: 10, right: 6, bottom: 22, left: 6 }
const PLOT_H = H - PAD.top - PAD.bottom
const SLOT = (W - PAD.left - PAD.right) / 7
const BAR_W = 20

type Props = {
  /** 月曜はじまりの7日分の日付キー */
  dates: string[]
  /** 日付キーごとの勉強時間（分） */
  days: Record<string, number>
  todayKey: string
  /** 1日あたりの目安（週の目標 ÷ 7）。0 なら線を出さない */
  dailyTargetMinutes: number
}

/** 今週（月〜日）の勉強時間の棒グラフ。1日の目安を点線で示す */
export default function WeekChart({ dates, days, todayKey, dailyTargetMinutes }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const values = dates.map((d) => days[d] ?? 0)
  // 縦軸の上限：一番長い日と目安の大きい方に少し余白を足す（最低1時間）
  const max = Math.max(60, ...values, dailyTargetMinutes) * 1.15
  const y = (minutes: number) => PAD.top + PLOT_H - (minutes / max) * PLOT_H
  const baseline = PAD.top + PLOT_H

  return (
    <figure className="week-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="今週の勉強時間のグラフ" onPointerLeave={() => setHover(null)}>
        {/* 1日の目安 */}
        {dailyTargetMinutes > 0 && (
          <g className="week-chart__target">
            <line x1={PAD.left} x2={W - PAD.right} y1={y(dailyTargetMinutes)} y2={y(dailyTargetMinutes)} />
          </g>
        )}
        <line className="week-chart__axis" x1={PAD.left} x2={W - PAD.right} y1={baseline} y2={baseline} />

        {values.map((v, i) => {
          const cx = PAD.left + SLOT * i + SLOT / 2
          const top = y(v)
          const h = baseline - top
          const isToday = dates[i] === todayKey
          return (
            <g key={dates[i]}>
              {v > 0 && (
                // 上だけ角を丸めた棒（下は軸にぴったり付ける）
                <path
                  className={`week-chart__bar${hover === i ? ' is-hover' : ''}`}
                  d={roundedTopBar(cx - BAR_W / 2, top, BAR_W, h, Math.min(4, h))}
                />
              )}
              <text className={`week-chart__label${isToday ? ' is-today' : ''}`} x={cx} y={H - 6} textAnchor="middle">
                {isToday ? '今日' : WEEKDAYS[i]}
              </text>
              {/* マウスを乗せる範囲は棒より広くする */}
              <rect
                className="week-chart__hit"
                x={cx - SLOT / 2}
                y={PAD.top}
                width={SLOT}
                height={PLOT_H}
                onPointerEnter={() => setHover(i)}
              />
            </g>
          )
        })}
      </svg>

      {hover !== null && (
        <div className="week-chart__tip" style={{ left: `${((PAD.left + SLOT * hover + SLOT / 2) / W) * 100}%` }} role="status">
          <strong>{formatMinutes(values[hover])}</strong>
          <span>{formatDate(dates[hover])}</span>
        </div>
      )}

      {dailyTargetMinutes > 0 && (
        <figcaption className="week-chart__legend">
          <span className="week-chart__dash" aria-hidden /> 1日の目安 {formatMinutes(Math.round(dailyTargetMinutes))}
        </figcaption>
      )}

      {/* 読み上げ用の表 */}
      <table className="visually-hidden">
        <caption>今週の勉強時間</caption>
        <tbody>
          {dates.map((d, i) => (
            <tr key={d}>
              <th scope="row">{formatDate(d)}</th>
              <td>{formatMinutes(values[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function formatDate(key: string) {
  const d = parseDateKey(key)
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[(d.getDay() + 6) % 7]}）`
}

/** 上の2つの角だけを丸めた長方形のパス */
function roundedTopBar(x: number, y: number, w: number, h: number, r: number) {
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}
