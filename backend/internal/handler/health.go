package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// Pinger はDBへの疎通確認ができるもの（*sql.DB が満たす）。
// テストで偽物に差し替えられるようにインターフェースにしている。
type Pinger interface {
	PingContext(ctx context.Context) error
}

// HealthHandler は GET /api/health を処理する。
type HealthHandler struct {
	DB Pinger
}

// Get はサーバーとDBの状態を返す。DBに接続できない場合は 503 を返す。
func (h *HealthHandler) Get(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	if err := h.DB.PingContext(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
