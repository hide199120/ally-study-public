import { useEffect, useState } from 'react'

/** active の間だけ、interval ミリ秒ごとに今の時刻を返し直す（タイマーの表示用） */
export function useNow(active: boolean, interval = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const first = window.setTimeout(() => setNow(Date.now()), 0)
    const id = window.setInterval(() => setNow(Date.now()), interval)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [active, interval])
  return now
}
