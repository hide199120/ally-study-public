package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Health は GET /api/health のハンドラー。サーバーが起動しているかを返す。
func Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
