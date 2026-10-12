// Package router は、ハンドラーとセキュリティのミドルウェアを組み合わせて、HTTP のルーティングを作る。
package router

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/hide199120/ally-study/backend/internal/api"
	"github.com/hide199120/ally-study/backend/internal/middleware"
	"github.com/hide199120/ally-study/backend/internal/ratelimit"
)

// Options はルーティングの設定。
type Options struct {
	// HTTPS で公開するとき true（HSTS ヘッダーを付ける）
	Secure bool
	// ビルドしたフロント（index.html など）の置き場所。空ならフロントは配らない（ローカル開発では Vite が配る）
	StaticDir string
	// 前に立っているプロキシ（ロードバランサー）の IP 範囲。ここからの X-Forwarded-For だけを信用する
	TrustedProxies []string
	// 接続元の IP アドレスが入っているヘッダー（例：CF-Connecting-IP）。
	// ホスティングが必ず上書きしてくれるヘッダーだけを指定する（利用者が偽れるヘッダーは指定しない）
	ClientIPHeader string
	// 回数制限の設定。nil なら DefaultLimits を使う
	Limits []middleware.Rule
}

// maxBodyBytes はリクエストの本文の上限。一番大きい「目標30個の保存」でも数KBなので、余裕を持って64KB。
const maxBodyBytes = 64 << 10

// DefaultLimits は、IP アドレスごとの回数制限。
//   - 新規登録：1時間に10回、全体で1日500回（アカウントの大量作成を防ぐ）
//   - ログイン：1分に10回、1時間に60回（パスワードの総当たりを防ぐ）
//   - 退会：10分に5回（パスワードの総当たりを防ぐ）
//   - 書き込み全般：1分に120回、API 全体：1分に600回
func DefaultLimits() []middleware.Rule {
	post := []string{http.MethodPost}
	writes := []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}
	return []middleware.Rule{
		{Methods: post, Path: "/api/auth/signup", Limiter: ratelimit.New(10, time.Hour)},
		// IP アドレスを偽られた場合に備えて、新規登録は全体でも1日500件まで
		{Methods: post, Path: "/api/auth/signup", Global: true, Limiter: ratelimit.New(500, 24*time.Hour)},
		{Methods: post, Path: "/api/auth/login", Limiter: ratelimit.New(10, time.Minute)},
		{Methods: post, Path: "/api/auth/login", Limiter: ratelimit.New(60, time.Hour)},
		{Methods: []string{http.MethodDelete}, Path: "/api/me", Limiter: ratelimit.New(5, 10*time.Minute)},
		{Methods: writes, Prefix: "/api/", Limiter: ratelimit.New(120, time.Minute)},
		{Prefix: "/api/", Limiter: ratelimit.New(600, time.Minute)},
	}
}

// New はルーターを作る。ミドルウェアは上から順にかかる。
func New(server api.ServerInterface, opts Options) (*gin.Engine, error) {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// 信用するプロキシ以外から来た X-Forwarded-For は無視する（IP アドレスを偽って回数制限を逃れられないように）
	if err := r.SetTrustedProxies(opts.TrustedProxies); err != nil {
		return nil, err
	}
	if opts.ClientIPHeader != "" {
		r.TrustedPlatform = opts.ClientIPHeader
	}

	limits := opts.Limits
	if limits == nil {
		limits = DefaultLimits()
	}
	r.Use(
		middleware.SecurityHeaders(opts.Secure),
		middleware.LimitBody(maxBodyBytes),
		middleware.RateLimit(limits...),
		middleware.SameOrigin(),
	)

	api.RegisterHandlersWithOptions(r, server, api.GinServerOptions{BaseURL: "/api"})

	if opts.StaticDir != "" {
		r.NoRoute(middleware.SPA(opts.StaticDir))
	}
	return r, nil
}
