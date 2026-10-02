package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/hide199120/ally-study/backend/internal/handler"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r := gin.Default()

	// プロキシ経由のリクエストは今のところ想定しないので、どのプロキシも信用しない
	if err := r.SetTrustedProxies(nil); err != nil {
		log.Fatal(err)
	}

	// OpenAPIのベースパス（/api）に合わせてグループ化する
	api := r.Group("/api")
	api.GET("/health", handler.Health)

	log.Printf("API server listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
