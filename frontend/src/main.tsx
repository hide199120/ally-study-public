import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './app/store'
import './index.css'
import App from './App.tsx'
import AdminPage from './features/admin/AdminPage.tsx'
import { analyticsListener } from './features/analytics/analyticsListener'
import { startPageTracking } from './features/analytics/pageTracking'
import { tracker } from './features/analytics/tracker'

// /admin はアクセス解析の管理画面（管理者だけが見られる）。それ以外はアプリ本体
const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin'

// アプリ本体を開いたときだけ、利用状況を記録する（管理画面を見たことは数えない）
if (!isAdmin) {
  tracker.enable()
  startPageTracking({ tracker, now: () => Date.now(), beforeLeave: analyticsListener.stopAllPlayingSounds })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>{isAdmin ? <AdminPage /> : <App />}</Provider>
  </StrictMode>,
)
