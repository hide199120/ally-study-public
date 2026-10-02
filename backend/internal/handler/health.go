package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/hide199120/ally-study/backend/internal/api"
)

// GetHealth は GET /api/health を処理する。DBに接続できない場合は 503 を返す。
func (s *Server) GetHealth(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	if err := s.DB.PingContext(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, api.Health{Status: api.HealthStatusUnavailable})
		return
	}
	c.JSON(http.StatusOK, api.Health{Status: api.HealthStatusOk})
}
