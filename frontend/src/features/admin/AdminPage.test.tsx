import { screen } from '@testing-library/react'
import { jsonResponse, mockApi, renderWithStore } from '../../test/utils'
import AdminPage from './AdminPage'

afterEach(() => jest.restoreAllMocks())

describe('AdminPage', () => {
  it('集計を数字とグラフで表示する', async () => {
    const { requests } = mockApi({
      'GET /api/admin/analytics/daily': () =>
        jsonResponse(200, {
          from: '2026-10-01',
          to: '2026-10-02',
          rows: [
            { date: '2026-10-01', name: 'page_view', events: 7, visitors: 3, durationSec: 0 },
            { date: '2026-10-01', name: 'page_leave', events: 2, visitors: 2, durationSec: 2400 },
          ],
        }),
    })
    renderWithStore(<AdminPage />)

    expect(await screen.findByText('3人')).toBeInTheDocument()
    expect(screen.getByText('20分')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '日別の訪問人数のグラフ' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /生ログをダウンロード/ })).toHaveAttribute('href', expect.stringContaining('/api/admin/analytics/export?from='))
    const url = new URL(requests[0].url)
    expect(url.searchParams.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('管理者でなければ「見つかりません」と表示する', async () => {
    mockApi({ 'GET /api/admin/analytics/daily': () => jsonResponse(404, { code: 'not_found', message: '見つかりません' }) })
    renderWithStore(<AdminPage />)
    expect(await screen.findByText('ページが見つかりません。')).toBeInTheDocument()
    expect(screen.queryByText('アクセス解析')).not.toBeInTheDocument()
  })
})
