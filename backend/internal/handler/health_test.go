package handler

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

type fakePinger struct{ err error }

func (f fakePinger) PingContext(context.Context) error { return f.err }

func TestHealthHandler_Get(t *testing.T) {
	gin.SetMode(gin.TestMode)

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
			h := &HealthHandler{DB: fakePinger{err: tt.pingErr}}
			r := gin.New()
			r.GET("/api/health", h.Get)

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
