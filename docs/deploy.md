# 公開（デプロイ）の手順

ally-study を無料で公開するときの手順です。構成は次のとおりです。

| 役割 | サービス | 備考 |
|---|---|---|
| アプリ（フロント＋API） | Render（Free） | `Dockerfile` でビルド。Go のサーバーがフロントも配る（同じドメイン） |
| データベース | TiDB Cloud Starter（無料枠） | MySQL 互換。通信は TLS で暗号化 |

Render の無料プランは、15 分アクセスがないと止まり、次のアクセスで起動に 1 分ほどかかります。

## 1. データベース（TiDB Cloud）

1. TiDB Cloud にサインアップし、**Starter** のクラスターを作る（リージョンは Render と近い **Singapore** にする）
2. 「Connect」から接続情報（Host / Port / User / Password）を確認する。パスワードは自分で生成し、安全な場所に控える
3. SQL エディターでデータベースを作る

   ```sql
   CREATE DATABASE ally_study;
   ```

テーブルは、アプリが起動するときに自動で作られます（`RUN_MIGRATIONS=true`）。

## 2. アプリ（Render）

1. Render にサインアップし、GitHub と連携する（このリポジトリへのアクセスを許可する）
2. 「New → Blueprint」でこのリポジトリを選ぶ（`render.yaml` の内容で作られる）
3. 画面で次の秘密の値を入力する（リポジトリには書かない）

   | 環境変数 | 値 |
   |---|---|
   | `DB_HOST` | TiDB の Host |
   | `DB_NAME` | `ally_study` |
   | `DB_USER` | TiDB の User |
   | `DB_PASSWORD` | TiDB の Password |

4. デプロイが終わったら、表示された URL（`https://〜.onrender.com`）を開いて動作を確認する

## 3. アクセス解析（任意）

利用状況のイベント（画面を開いた・BGM を流したなど）は、本体とは別の DB に保存できます。
別にしておくと、解析で無料枠を使い切っても本体は止まりません。設定しなければ本体と同じ DB に保存します。

1. TiDB Cloud で **Starter** のクラスターをもう1つ作り（無料枠はクラスターごと）、`CREATE DATABASE ally_analytics;` を実行する
2. Render の「Environment」に次の値を追加する

   | 環境変数 | 値 |
   |---|---|
   | `ANALYTICS_DB_HOST` | 解析用クラスターの Host |
   | `ANALYTICS_DB_NAME` | `ally_analytics` |
   | `ANALYTICS_DB_USER` | 解析用クラスターの User |
   | `ANALYTICS_DB_PASSWORD` | 解析用クラスターの Password |
   | `ADMIN_USER_IDS` | 管理画面を見られるユーザーの ID（カンマ区切り） |

3. 管理者でログインして `/admin` を開くと、日別のグラフが見られる。生ログは JSON Lines でダウンロードできる

テーブルは起動時に自動で作られます。管理者以外が `/admin` の API を呼ぶと 404 を返します。
ユーザーが退会すると、そのユーザーのイベントからはユーザー ID だけが外れ、匿名のイベントとして残ります（集計の数字は変わりません）。

## 本番で有効になる設定

| 環境変数 | 値 | 意味 |
|---|---|---|
| `GIN_MODE` | `release` | デバッグ表示を止める（Dockerfile で設定） |
| `STATIC_DIR` | `/public` | ビルドしたフロントを配る（Dockerfile で設定） |
| `COOKIE_SECURE` | `true` | Cookie を HTTPS のときだけ送る・HSTS を返す |
| `DB_PASSWORD` | （必須） | 本番では必ず設定する。未設定だと、開発用の初期値で DB につながらないよう、起動を止める |
| `DB_TLS` | `true` | DB との通信を暗号化する |
| `RUN_MIGRATIONS` | `true` | 起動時にテーブルを作る・更新する |
| `TRUSTED_PROXIES` | `10.0.0.0/8` | Render の内部ネットワークからの `X-Forwarded-For` だけを信用する |
| `CLIENT_IP_HEADER` | （未設定） | 接続元 IP が入るヘッダー。Render ではログに接続元の IP が正しく出ることを確認済みなので、設定は不要。前に別のプロキシ（CDN など）を置いたときだけ、そのヘッダー名を設定する |

## セキュリティ対策の一覧

- パスワードは bcrypt でハッシュ化。セッショントークンも DB にはハッシュ値だけを保存
- Cookie は `HttpOnly` / `SameSite=Lax` / `Secure`
- CSRF：`Sec-Fetch-Site`・`Origin` の確認と、書き込みは JSON だけ受け付ける
- 回数制限：ログイン（IP ごと・ユーザー名ごと）、新規登録（IP ごと・全体）、退会、書き込み全般
- リクエスト本文は 64KB まで。勉強記録は 1 日 24 時間・100 回まで
- セキュリティヘッダー：CSP、`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、HSTS
- 退会すると、ユーザーと部屋・学習記録・セッションをすべて削除。アクセス解析のイベントからは、ユーザー ID を外して匿名にする
- 本番（`GIN_MODE=release`）で `DB_PASSWORD` が未設定のままなら、起動を止める
- CI で `npm audit` と `govulncheck` によるライブラリの脆弱性チェック
