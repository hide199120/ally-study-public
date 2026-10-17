import type { AnalyticsDevice, AnalyticsEventBatch, AnalyticsEventInput, AnalyticsEventName } from '../../api/types'

/** ためたイベントを送るまでの時間。数秒ぶんをまとめて1回で送り、DB への書き込み回数を減らす */
const FLUSH_DELAY_MS = 10_000
/** 1回で送れるイベントの上限（API の maxItems と同じ） */
const MAX_BATCH = 20
/** 1ページで送るエラーの上限（同じエラーが繰り返し起きても送りすぎないように） */
const MAX_ERRORS_PER_PAGE = 5
const ANON_ID_KEY = 'ally-study:anonymous-id'

type Properties = NonNullable<AnalyticsEventInput['properties']>

export type TrackerDeps = {
  fetch: typeof fetch
  storage: Pick<Storage, 'getItem' | 'setItem'> | null
  randomId: () => string
  isMobile: () => boolean
  setTimeout: (fn: () => void, ms: number) => unknown
  clearTimeout: (id: unknown) => void
  endpoint: string
}

/**
 * アクセス解析のイベントを集めて、まとめて送る。
 * - track() はキューに入れるだけ。一定時間たつか、上限まで溜まったら送る
 * - 画面を閉じるときは keepalive 付きで送る（ページが閉じても送信が続く）
 * - 送信に失敗しても画面の操作には関係ないので、エラーは無視する
 */
export function createTracker(deps: TrackerDeps) {
  let enabled = false
  let queue: AnalyticsEventInput[] = []
  let timer: unknown = null
  let errorCount = 0
  let anonymousId: string | null = null

  /** ブラウザごとの匿名ID。保存できない環境（プライベートモードなど）では、この画面の間だけ使う */
  function getAnonymousId(): string {
    if (anonymousId) return anonymousId
    try {
      const saved = deps.storage?.getItem(ANON_ID_KEY)
      if (saved && /^[0-9a-f-]{36}$/.test(saved)) {
        anonymousId = saved
        return saved
      }
    } catch {
      // 読めなければ新しく作る
    }
    anonymousId = deps.randomId()
    try {
      deps.storage?.setItem(ANON_ID_KEY, anonymousId)
    } catch {
      // 保存できなくても、この画面の間は同じIDを使う
    }
    return anonymousId
  }

  function send(events: AnalyticsEventInput[], keepalive: boolean) {
    const device: AnalyticsDevice = deps.isMobile() ? 'mobile' : 'pc'
    const body: AnalyticsEventBatch = { anonymousId: getAnonymousId(), device, events }
    deps
      .fetch(deps.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
        keepalive,
      })
      .catch(() => {
        // 送れなかったイベントは捨てる（解析のために画面の動きを止めない）
      })
  }

  /** ためているイベントを今すぐ送る。keepalive は画面を閉じるときに使う */
  function flush({ keepalive = false } = {}) {
    if (timer !== null) {
      deps.clearTimeout(timer)
      timer = null
    }
    while (queue.length > 0) {
      send(queue.slice(0, MAX_BATCH), keepalive)
      queue = queue.slice(MAX_BATCH)
    }
  }

  function track(name: AnalyticsEventName, properties?: Properties) {
    if (!enabled) return
    if (name === 'client_error') {
      if (errorCount >= MAX_ERRORS_PER_PAGE) return
      errorCount++
    }
    queue.push(properties ? { name, properties } : { name })
    if (queue.length >= MAX_BATCH) {
      flush()
    } else if (timer === null) {
      timer = deps.setTimeout(() => {
        timer = null
        flush()
      }, FLUSH_DELAY_MS)
    }
  }

  return {
    track,
    flush,
    /** 送信を始める。テストや開発中に勝手に送らないよう、main.tsx から呼んだときだけ動く */
    enable() {
      enabled = true
    },
    get enabled() {
      return enabled
    },
    getAnonymousId,
    /** テスト用：ためているイベント */
    get queued() {
      return queue
    },
  }
}

export type Tracker = ReturnType<typeof createTracker>

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // 古いブラウザ向け：UUID と同じ形のランダムな文字列
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16)
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** アプリ全体で使うトラッカー */
export const tracker = createTracker({
  fetch: (...args) => globalThis.fetch(...args),
  storage: safeLocalStorage(),
  randomId,
  isMobile: () => typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches,
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (id) => window.clearTimeout(id as number),
  endpoint: `${window.location.origin}/api/analytics/events`,
})
