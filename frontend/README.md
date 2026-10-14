# frontend

ally-study のフロントエンドです（React + TypeScript + Vite）。
全体の説明は [ルートの README](../README.md) を参照してください。

## 起動

API サーバー（`docker compose up`）を起動したうえで、次を実行します。

```bash
npm install
npm run dev   # http://localhost:5173
```

`/api` へのリクエストは `vite.config.ts` の設定で `http://localhost:8080` に転送されます。

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバーを起動 |
| `npm test` | Jest + Testing Library でテスト |
| `npm run lint` | ESLint |
| `npm run build` | 型チェック（tsc）とビルド |
| `npm run gen:api` | `../api/openapi.yaml` から API の型（`src/api/schema.d.ts`）を生成 |

## ディレクトリ構成

```
src/
├── app/          # Redux の store と型付きの hooks
├── api/          # OpenAPI から生成した型
├── features/     # 機能ごとのコード（slice・RTK Query・コンポーネント・テストを同じ場所に置く）
│   ├── auth/     # 新規登録・ログイン・退会
│   ├── room/     # 3D の部屋・家具・模様替え（React Three Fiber）
│   ├── sound/    # BGM・環境音の生成と再生
│   ├── study/    # タイマー・学習記録・目標・グラフ
│   └── theme/    # テーマの切り替え
└── test/         # テスト用の設定とヘルパー
```

## 状態管理の方針

- 画面の状態（テーマ・模様替え中かどうか・タイマーなど）は Redux Toolkit の slice で管理
- サーバーとのやり取りは RTK Query（`authApi` / `roomApi` / `studyApi`）で行い、キャッシュも任せる
