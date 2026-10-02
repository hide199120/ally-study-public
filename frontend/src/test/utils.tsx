import type { ReactElement } from 'react'
import { Provider } from 'react-redux'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makeStore } from '../app/store'

/** テストごとに新しい Redux ストアを作って、コンポーネントを描画する */
export function renderWithStore(ui: ReactElement) {
  const store = makeStore()
  const user = userEvent.setup()
  return { store, user, ...render(<Provider store={store}>{ui}</Provider>) }
}

/** JSON のレスポンスを作る */
export function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Route = `${'GET' | 'POST'} ${string}`

/**
 * fetch を差し替えて、「メソッド + パス」ごとに決めたレスポンスを返す。
 * 呼ばれたリクエストは requests に記録される。
 */
export function mockApi(routes: Record<Route, () => Response>) {
  const requests: Request[] = []
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const req = new Request(input, init)
    requests.push(req)
    const key = `${req.method} ${new URL(req.url).pathname}` as Route
    const handler = routes[key]
    if (!handler) throw new Error(`モックされていないリクエスト: ${key}`)
    return handler()
  })
  return { requests }
}
