import type { Tracker } from './tracker'

/**
 * どこから来たか（流入元）を、URL の utm_source と参照元から決める。
 * X や Zenn での紹介の効果を比べるため、よく来るサイトは名前にまとめる。
 */
export function trafficSource(search: string, referrer: string, ownHost: string): { source: string; referrer?: string } {
  const utm = new URLSearchParams(search).get('utm_source')
  if (utm) return { source: utm.toLowerCase().slice(0, 32) }

  let host: string
  try {
    host = referrer ? new URL(referrer).hostname : ''
  } catch {
    host = ''
  }
  if (!host || host === ownHost) return { source: 'direct' }
  if (host === 't.co' || host === 'x.com' || host.endsWith('.x.com') || host === 'twitter.com' || host.endsWith('.twitter.com')) {
    return { source: 'x', referrer: host }
  }
  if (host === 'zenn.dev' || host.endsWith('.zenn.dev')) return { source: 'zenn', referrer: host }
  if (/(^|\.)google\./.test(host) || host.endsWith('bing.com') || host.endsWith('yahoo.co.jp') || host.endsWith('duckduckgo.com')) {
    return { source: 'search', referrer: host }
  }
  return { source: 'other', referrer: host }
}

type PageDeps = {
  tracker: Tracker
  now: () => number
  /** 画面を閉じる直前に呼ぶ（鳴っている音の再生時間を記録するなど） */
  beforeLeave?: () => void
  win?: Window
  doc?: Document
}

/**
 * 画面を開いた・閉じた・エラーが起きたことを記録する。
 * - page_view：開いたとき。流入元と端末つき
 * - page_leave：閉じたとき。開いていた秒数（勉強中は別のタブを見ていることも多いので、裏にある時間も含める）
 * - client_error：画面で拾えなかったエラー
 * 戻り値の関数を呼ぶと、記録をやめる（テスト用）。
 */
export function startPageTracking({ tracker, now, beforeLeave, win = window, doc = document }: PageDeps): () => void {
  let openedAt = now()
  let left = false
  const trackView = () => {
    tracker.track('page_view', trafficSource(win.location.search, doc.referrer, win.location.hostname))
    // 開いたことはすぐ分かるように、待たずに送る
    tracker.flush()
  }
  trackView()

  const onPageHide = () => {
    if (left) return
    left = true
    beforeLeave?.()
    tracker.track('page_leave', { durationSec: Math.max(0, Math.round((now() - openedAt) / 1000)) })
    tracker.flush({ keepalive: true })
  }
  // 戻る・進むのキャッシュから戻ってきたら、もう一度開いたものとして数える
  const onPageShow = (e: PageTransitionEvent) => {
    if (!e.persisted || !left) return
    left = false
    openedAt = now()
    trackView()
  }
  // 裏に回ったら、ためているイベントを送っておく（スマホではそのまま閉じられることが多い）
  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') tracker.flush({ keepalive: true })
  }
  const onError = (e: ErrorEvent) => {
    tracker.track('client_error', { message: String(e.message || 'error').slice(0, 200) })
  }
  const onRejection = (e: PromiseRejectionEvent) => {
    const reason = e.reason instanceof Error ? e.reason.message : String(e.reason)
    tracker.track('client_error', { message: `unhandledrejection: ${reason}`.slice(0, 200) })
  }

  win.addEventListener('pagehide', onPageHide)
  win.addEventListener('pageshow', onPageShow)
  doc.addEventListener('visibilitychange', onVisibility)
  win.addEventListener('error', onError)
  win.addEventListener('unhandledrejection', onRejection)
  return () => {
    win.removeEventListener('pagehide', onPageHide)
    win.removeEventListener('pageshow', onPageShow)
    doc.removeEventListener('visibilitychange', onVisibility)
    win.removeEventListener('error', onError)
    win.removeEventListener('unhandledrejection', onRejection)
  }
}
