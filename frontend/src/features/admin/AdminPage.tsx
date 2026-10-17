import { useMemo, useState } from 'react'
import { useApplyTheme } from '../theme/useApplyTheme'
import { dateKey } from '../study/time'
import { exportUrl, useGetAnalyticsDailyQuery } from './adminApi'
import DailyBars from './DailyBars'
import { summarize } from './summarize'
import '../../App.css'
import './admin.css'

const PRESETS = [7, 30, 90] as const

/** 今日から days 日前〜今日（両端を含む） */
function lastDays(days: number, today = new Date()) {
  const from = new Date(today)
  from.setDate(from.getDate() - (days - 1))
  return { from: dateKey(from), to: dateKey(today) }
}

const EVENT_LABELS: Record<string, string> = {
  page_view: '画面を開いた',
  page_leave: '画面を閉じた',
  sound_play: 'BGM・環境音を再生',
  sound_stop: 'BGM・環境音を停止',
  room_save: '模様替えを保存',
  study_session: '勉強時間を記録',
  theme_change: 'テーマを変更',
  signup: '新規登録',
  login: 'ログイン',
  account_delete: '退会',
  client_error: '画面のエラー',
}

/**
 * アクセス解析の管理画面（/admin）。管理者だけが見られる。
 * 日別の集計をグラフにし、生ログは JSON Lines でダウンロードしてテキストエディタで読む。
 */
export default function AdminPage() {
  useApplyTheme()
  const [range, setRange] = useState(() => lastDays(30))
  const { data, error, isFetching } = useGetAnalyticsDailyQuery(range)
  const summary = useMemo(() => (data ? summarize(data.rows, data.from, data.to) : null), [data])

  const notFound = error && 'status' in error && error.status === 404
  if (notFound) {
    return (
      <div className="admin-page">
        <main className="admin">
          <p className="admin__message">ページが見つかりません。</p>
          <a className="admin__link" href="/">トップへ戻る</a>
        </main>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <main className="admin">
        <header className="admin__header">
          <h1>アクセス解析</h1>
          <a className="admin__link" href="/">アプリへ戻る</a>
        </header>

        <section className="admin__controls widget" aria-label="期間">
          <div className="admin__presets" role="group" aria-label="期間をえらぶ">
            {PRESETS.map((d) => (
              <button key={d} type="button" className="admin__chip" onClick={() => setRange(lastDays(d))}>
                直近{d}日
              </button>
            ))}
          </div>
          <label>
            開始日
            <input type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })} />
          </label>
          <label>
            終了日
            <input type="date" value={range.to} min={range.from} onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })} />
          </label>
          <a className="admin__download" href={exportUrl(range.from, range.to)} download>
            生ログをダウンロード（JSON Lines）
          </a>
        </section>

        {error && !notFound && <p className="admin__message" role="alert">読み込めませんでした（期間は92日以内で指定してください）。</p>}
        {isFetching && !summary && <p className="admin__message">読み込み中…</p>}

        {summary && (
          <>
            <section className="admin__tiles" aria-label="期間の合計">
              <Tile label="訪問人数（日ごとの合計）" value={`${summary.totals.visitorDays}人`} />
              <Tile label="画面を開いた回数" value={`${summary.totals.pageViews}回`} />
              <Tile label="平均滞在時間" value={`${summary.totals.avgStayMinutes}分`} />
              <Tile label="BGM・環境音の再生" value={`${summary.totals.soundPlays}回`} />
              <Tile label="平均再生時間" value={`${summary.totals.avgSoundMinutes}分`} />
              <Tile label="勉強時間の記録" value={`${summary.totals.studySessions}回`} />
            </section>

            <section className="admin__charts">
              <div className="widget admin__card">
                <DailyBars title="日別の訪問人数" points={summary.visitors} format={(v) => `${v}人`} />
              </div>
              <div className="widget admin__card">
                <DailyBars title="日別の平均滞在時間" points={summary.avgStayMinutes} format={(v) => `${v}分`} />
              </div>
            </section>

            <section className="widget admin__card">
              <h2>イベントごとの件数</h2>
              {summary.byEvent.length === 0 ? (
                <p className="admin__message">この期間の記録はまだありません。</p>
              ) : (
                <table className="admin__table">
                  <thead>
                    <tr>
                      <th scope="col">イベント</th>
                      <th scope="col">件数</th>
                      <th scope="col">人数（日ごとの合計）</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byEvent.map((e) => (
                      <tr key={e.name}>
                        <th scope="row">
                          {EVENT_LABELS[e.name] ?? e.name} <code>{e.name}</code>
                        </th>
                        <td>{e.events}</td>
                        <td>{e.visitors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="widget admin__tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
