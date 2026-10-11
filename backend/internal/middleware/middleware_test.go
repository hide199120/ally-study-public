package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/hide199120/ally-study/backend/internal/ratelimit"
)

func newEngine(mw ...gin.HandlerFunc) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(mw...)
	ok := func(c *gin.Context) { c.Status(http.StatusOK) }
	r.POST("/api/auth/login", ok)
	r.POST("/api/me/room", ok)
	r.GET("/api/me", ok)
	r.POST("/api/echo", func(c *gin.Context) {
		var v map[string]any
		if err := c.ShouldBindJSON(&v); err != nil {
			c.Status(http.StatusBadRequest)
			return
		}
		c.Status(http.StatusOK)
	})
	return r
}

func send(r http.Handler, method, path, body string, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Host = "ally.example.com"
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

var jsonHeader = map[string]string{"Content-Type": "application/json"}

func TestRateLimiter_Window(t *testing.T) {
	now := time.Date(2026, 10, 12, 0, 0, 0, 0, time.UTC)
	l := ratelimit.New(2, time.Minute)
	l.SetClock(func() time.Time { return now })

	for i := 0; i < 2; i++ {
		if ok, _ := l.Allow("1.2.3.4"); !ok {
			t.Fatalf("%d回目は受け付けるはず", i+1)
		}
	}
	ok, wait := l.Allow("1.2.3.4")
	if ok || wait != time.Minute {
		t.Fatalf("3回目は断るはず: ok=%v wait=%v", ok, wait)
	}
	if ok, _ := l.Allow("5.6.7.8"); !ok {
		t.Fatal("別の IP は数えないはず")
	}
	now = now.Add(time.Minute)
	if ok, _ := l.Allow("1.2.3.4"); !ok {
		t.Fatal("時間がたてばまた受け付けるはず")
	}
}

func TestRateLimit_Middleware(t *testing.T) {
	r := newEngine(RateLimit(Rule{Methods: []string{http.MethodPost}, Path: "/api/auth/login", Limiter: ratelimit.New(1, time.Minute)}))
	if w := send(r, http.MethodPost, "/api/auth/login", "", nil); w.Code != http.StatusOK {
		t.Fatalf("1回目 = %d", w.Code)
	}
	w := send(r, http.MethodPost, "/api/auth/login", "", nil)
	if w.Code != http.StatusTooManyRequests || w.Header().Get("Retry-After") != "60" {
		t.Fatalf("2回目 = %d, Retry-After = %q", w.Code, w.Header().Get("Retry-After"))
	}
	if w := send(r, http.MethodGet, "/api/me", "", nil); w.Code != http.StatusOK {
		t.Fatalf("ルールに当てはまらないパスは数えないはず: %d", w.Code)
	}
}

func TestSameOrigin(t *testing.T) {
	r := newEngine(SameOrigin())
	tests := []struct {
		name    string
		method  string
		body    string
		headers map[string]string
		want    int
	}{
		{"同じサイトからの JSON", http.MethodPost, `{}`, map[string]string{"Content-Type": "application/json", "Origin": "https://ally.example.com", "Sec-Fetch-Site": "same-origin"}, 200},
		{"Origin なし（curl など）", http.MethodPost, `{}`, jsonHeader, 200},
		{"別のサイトの Origin", http.MethodPost, `{}`, map[string]string{"Content-Type": "application/json", "Origin": "https://evil.example.net"}, 403},
		{"Sec-Fetch-Site が cross-site", http.MethodPost, `{}`, map[string]string{"Content-Type": "application/json", "Sec-Fetch-Site": "cross-site"}, 403},
		{"Sec-Fetch-Site が same-site（サブドメイン）", http.MethodPost, `{}`, map[string]string{"Content-Type": "application/json", "Sec-Fetch-Site": "same-site"}, 403},
		{"フォーム形式の本文", http.MethodPost, `a=1`, map[string]string{"Content-Type": "application/x-www-form-urlencoded"}, 415},
		{"text/plain の本文", http.MethodPost, `{}`, map[string]string{"Content-Type": "text/plain"}, 415},
		{"本文なしの POST（ログアウトなど）", http.MethodPost, ``, nil, 200},
		{"GET は確認しない", http.MethodGet, ``, map[string]string{"Origin": "https://evil.example.net"}, 200},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := "/api/me/room"
			if tt.method == http.MethodGet {
				path = "/api/me"
			}
			if w := send(r, tt.method, path, tt.body, tt.headers); w.Code != tt.want {
				t.Errorf("status = %d, want %d", w.Code, tt.want)
			}
		})
	}
}

func TestLimitBody(t *testing.T) {
	r := newEngine(LimitBody(16))
	if w := send(r, http.MethodPost, "/api/echo", `{"a":1}`, jsonHeader); w.Code != http.StatusOK {
		t.Fatalf("小さい本文 = %d", w.Code)
	}
	if w := send(r, http.MethodPost, "/api/echo", `{"a":"`+strings.Repeat("x", 100)+`"}`, jsonHeader); w.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("大きい本文 = %d", w.Code)
	}
	// Content-Length をごまかして送られても、読み込みの途中で止まる
	req := httptest.NewRequest(http.MethodPost, "/api/echo", strings.NewReader(`{"a":"`+strings.Repeat("x", 100)+`"}`))
	req.Header.Set("Content-Type", "application/json")
	req.ContentLength = -1
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("長さ不明の大きい本文 = %d", w.Code)
	}
}

func TestSecurityHeaders(t *testing.T) {
	w := send(newEngine(SecurityHeaders(true)), http.MethodGet, "/api/me", "", nil)
	for _, h := range []string{"Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Strict-Transport-Security"} {
		if w.Header().Get(h) == "" {
			t.Errorf("%s が付いていない", h)
		}
	}
	if !strings.Contains(w.Header().Get("Content-Security-Policy"), "script-src 'self'") {
		t.Error("スクリプトは自分のサイトからだけにするはず")
	}
	w = send(newEngine(SecurityHeaders(false)), http.MethodGet, "/api/me", "", nil)
	if w.Header().Get("Strict-Transport-Security") != "" {
		t.Error("HTTPS でないときは HSTS を付けないはず")
	}
}

func TestSPA(t *testing.T) {
	root := t.TempDir()
	dist := filepath.Join(root, "dist")
	must := func(err error) {
		if err != nil {
			t.Fatal(err)
		}
	}
	must(os.MkdirAll(filepath.Join(dist, "assets"), 0o755))
	must(os.WriteFile(filepath.Join(dist, "index.html"), []byte("<html>index</html>"), 0o644))
	must(os.WriteFile(filepath.Join(dist, "assets", "app-123.js"), []byte("console.log(1)"), 0o644))
	must(os.WriteFile(filepath.Join(root, "secret.txt"), []byte("secret"), 0o644))

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.NoRoute(SPA(dist))

	w := send(r, http.MethodGet, "/assets/app-123.js", "", nil)
	if w.Code != 200 || !strings.Contains(w.Body.String(), "console.log") || !strings.Contains(w.Header().Get("Cache-Control"), "immutable") {
		t.Errorf("assets: %d %q %q", w.Code, w.Body.String(), w.Header().Get("Cache-Control"))
	}
	w = send(r, http.MethodGet, "/some/page", "", nil)
	if w.Code != 200 || !strings.Contains(w.Body.String(), "index") {
		t.Errorf("知らないパスは index.html のはず: %d %q", w.Code, w.Body.String())
	}
	w = send(r, http.MethodGet, "/../secret.txt", "", nil)
	if strings.Contains(w.Body.String(), "secret") {
		t.Error("フォルダの外のファイルを読めてはいけない")
	}
	w = send(r, http.MethodGet, "/api/unknown", "", nil)
	if w.Code != http.StatusNotFound || !strings.Contains(w.Body.String(), "not_found") {
		t.Errorf("/api の知らないパスは JSON の 404 のはず: %d %q", w.Code, w.Body.String())
	}
	w = send(r, http.MethodGet, "/assets/app-123.js", "", map[string]string{"Accept-Encoding": "gzip, br"})
	if w.Header().Get("Content-Encoding") != "gzip" || !strings.Contains(w.Header().Get("Content-Type"), "javascript") {
		t.Errorf("gzip を受け取れるなら圧縮して返すはず: %q %q", w.Header().Get("Content-Encoding"), w.Header().Get("Content-Type"))
	}
	w = send(r, http.MethodPost, "/some/page", "", nil)
	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("GET 以外は 405 のはず: %d", w.Code)
	}
}

func TestRateLimit_Global(t *testing.T) {
	r := newEngine(RateLimit(Rule{Path: "/api/auth/login", Global: true, Limiter: ratelimit.New(1, time.Minute)}))
	send(r, http.MethodPost, "/api/auth/login", "", map[string]string{"X-Real-Ip": "1.1.1.1"})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", nil)
	req.RemoteAddr = "9.9.9.9:1234"
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("全体で数えるルールは IP が違っても断るはず: %d", w.Code)
	}
}
