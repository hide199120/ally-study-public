package middleware

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
)

// contentSecurityPolicy は、ブラウザが読み込んでよい場所を自分のサイトに限る設定。
// 例外は Google Fonts（CSS と フォント本体）だけ。
// three.js などが style 属性を JavaScript で書きかえるため、style-src には 'unsafe-inline' を残す
// （script には付けないので、外から差し込まれたスクリプトは動かない）。
const contentSecurityPolicy = "default-src 'self'; " +
	"script-src 'self'; " +
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
	"font-src 'self' https://fonts.gstatic.com; " +
	"img-src 'self' data: blob:; " +
	"media-src 'self' blob:; " +
	"connect-src 'self'; " +
	"worker-src 'self' blob:; " +
	"object-src 'none'; " +
	"base-uri 'self'; " +
	"form-action 'self'; " +
	"frame-ancestors 'none'"

// SecurityHeaders は、ブラウザ側の守りを強くするレスポンスヘッダーを付ける。
// hsts を true にすると「このサイトには今後 HTTPS でしかつながない」と覚えさせる（本番の HTTPS 環境用）。
func SecurityHeaders(hsts bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("Content-Security-Policy", contentSecurityPolicy)
		h.Set("X-Content-Type-Options", "nosniff") // ファイルの種類をブラウザに推測させない
		h.Set("X-Frame-Options", "DENY")           // 他のサイトの iframe に埋め込ませない（古いブラウザ用）
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
		h.Set("Cross-Origin-Opener-Policy", "same-origin")
		if hsts {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}

// LimitBody は、リクエストの本文の大きさを maxBytes までに制限する。
// 大きすぎる本文を送りつけてメモリを使わせる攻撃を防ぐ（超えると JSON の読み込みでエラーになる）。
func LimitBody(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxBytes {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{
				"code":    "payload_too_large",
				"message": "送信するデータが大きすぎます",
			})
			return
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

// SameOrigin は、他のサイトから送られてきた書き込みリクエストを断る（CSRF対策）。
// Cookie の SameSite=Lax に加えて、次の3つを確認する。
//   - ブラウザが付ける Sec-Fetch-Site が「別のサイト」なら断る
//   - Origin ヘッダーがあれば、ホストがこのサーバーと同じか確認する
//   - 本文があるなら Content-Type が JSON か確認する（HTML のフォームからは JSON を送れない）
func SameOrigin() gin.HandlerFunc {
	return func(c *gin.Context) {
		switch c.Request.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			c.Next()
			return
		}

		if site := c.GetHeader("Sec-Fetch-Site"); site != "" && site != "same-origin" && site != "none" {
			forbidden(c)
			return
		}
		if origin := c.GetHeader("Origin"); origin != "" {
			u, err := url.Parse(origin)
			if err != nil || !strings.EqualFold(u.Host, c.Request.Host) {
				forbidden(c)
				return
			}
		}
		if c.Request.ContentLength != 0 && !strings.HasPrefix(c.ContentType(), "application/json") {
			c.AbortWithStatusJSON(http.StatusUnsupportedMediaType, gin.H{
				"code":    "unsupported_media_type",
				"message": "JSON で送信してください",
			})
			return
		}
		c.Next()
	}
}

func forbidden(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
		"code":    "forbidden",
		"message": "このリクエストは受け付けられません",
	})
}
