import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 開発中は /api へのリクエストをGoのAPIサーバーに転送する。
    // ブラウザから見るとフロントとAPIが同じオリジンになるので、Cookieをそのまま使える。
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
