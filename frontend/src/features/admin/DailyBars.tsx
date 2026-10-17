import { useState } from 'react'
import type { DayPoint } from './summarize'

const W = 640
const H = 180
const PAD = { top: 12, right: 8, bottom: 22, left: 8 }
const PLOT_H = H - PAD.top - PAD.bottom

type Props = {
  title: string
  points: DayPoint[]
  /** ツールチップに出す値の書き方 */
  format: (v: number) => string
}

/** 日ごとの値の棒グラフ（1系列）。棒にカーソルを当てると、その日の値を出す */
export default function DailyBars({ title, points, format }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...points.map((p) => p.value)) * 1.15
  const slot = (W - PAD.left - PAD.right) / Math.max(1, points.length)
  const barW = Math.max(2, Math.min(18, slot - 2))
  const baseline = PAD.top + PLOT_H
  // 日付のラベルは、多すぎると重なるので間引く
  const labelEvery = Math.ceil(points.length / 8)
  const hovered = hover === null ? null : points[hover]

  return (
    <figure className="daily-bars">
      <figcaption className="daily-bars__title">{title}</figcaption>
      <div className="daily-bars__plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}のグラフ`} onPointerLeave={() => setHover(null)}>
          <line className="daily-bars__axis" x1={PAD.left} x2={W - PAD.right} y1={baseline} y2={baseline} />
          {points.map((p, i) => {
            const cx = PAD.left + slot * i + slot / 2
            const h = (p.value / max) * PLOT_H
            return (
              <g key={p.date}>
                {p.value > 0 && (
                  <rect
                    className={`daily-bars__bar${hover === i ? ' is-hover' : ''}`}
                    x={cx - barW / 2}
                    y={baseline - h}
                    width={barW}
                    height={h}
                    rx={Math.min(3, barW / 2, h)}
                  />
                )}
                {/* 当たり判定は棒より広くとる */}
                <rect className="daily-bars__hit" x={cx - slot / 2} y={PAD.top} width={slot} height={PLOT_H} onPointerEnter={() => setHover(i)} />
                {i % labelEvery === 0 && (
                  <text className="daily-bars__label" x={cx} y={H - 6} textAnchor="middle">
                    {p.date.slice(5).replace('-', '/')}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        {hovered && (
          <div className="daily-bars__tip" style={{ left: `${((PAD.left + slot * (hover ?? 0) + slot / 2) / W) * 100}%` }}>
            <span>{hovered.date}</span>
            <strong>{format(hovered.value)}</strong>
          </div>
        )}
      </div>
    </figure>
  )
}
