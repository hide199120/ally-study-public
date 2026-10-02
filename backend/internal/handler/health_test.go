package handler

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/hide199120/ally-study/backend/internal/api"
)

type fakePinger struct{ err error }

func (f fakePinger) PingContext(context.Context) error { return f.err }

// newTestRouter は本番と同じルーティングでテスト用のルーターを作る。
func newTestRouter(s *Server) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	api.RegisterHandlersWithOptions(r, s, api.GinServerOptions{BaseURL: "/api"})
	return r
}

func TestServer_GetHealth(t *testing.T) {
	tests := []struct {
		name     string
		pingErr  error
		wantCode int
		wantBody string
	}{
		{name: "DBに接続できる", pingErr: nil, wantCode: http.StatusOK, wantBody: `{"status":"ok"}`},
		{name: "DBに接続できない", pingErr: errors.New("connection refused"), wantCode: http.StatusServiceUnavailable, wantBody: `{"status":"unavailable"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := newTestRouter(&Server{DB: fakePinger{err: tt.pingErr}})

			w := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
			r.ServeHTTP(w, req)

			if w.Code != tt.wantCode {
				t.Fatalf("status = %d, want %d", w.Code, tt.wantCode)
			}
			if got := w.Body.String(); got != tt.wantBody {
				t.Fatalf("body = %s, want %s", got, tt.wantBody)
			}
		})
	}
}
