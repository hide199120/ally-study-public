// Package middleware は、すべてのリクエストに共通でかけるセキュリティの処理をまとめる。
package middleware

import (
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/hide199120/ally-study/backend/internal/ratelimit"
)

// Rule は「どのリクエストを、どの RateLimiter で数えるか」。
//   - Methods が空なら、すべてのメソッドに当てはまる
//   - Path は完全一致、Prefix は前方一致。どちらも空ならすべてのパス
type Rule struct {
	Methods []string
	Path    string
	Prefix  string
	// Global を true にすると、IP アドレスに関係なく全体で数える（例：1日の新規登録の総数）
	Global  bool
	Limiter *ratelimit.Limiter
}

func (r Rule) matches(c *gin.Context) bool {
	if len(r.Methods) > 0 {
		ok := false
		for _, m := range r.Methods {
			if m == c.Request.Method {
				ok = true
				break
			}
		}
		if !ok {
			return false
		}
	}
	p := c.Request.URL.Path
	if r.Path != "" && r.Path != p {
		return false
	}
	return r.Prefix == "" || strings.HasPrefix(p, r.Prefix)
}

// RateLimit は、当てはまるルールごとに接続元のIPアドレスで回数を数え、多すぎれば 429 を返す。
func RateLimit(rules ...Rule) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		for _, r := range rules {
			if !r.matches(c) {
				continue
			}
			key := ip
			if r.Global {
				key = "*"
			}
			if ok, wait := r.Limiter.Allow(key); !ok {
				c.Header("Retry-After", strconv.Itoa(int(math.Ceil(wait.Seconds()))))
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
					"code":    "too_many_requests",
					"message": "操作が多すぎます。しばらく待ってからもう一度お試しください",
				})
				return
			}
		}
		c.Next()
	}
}
