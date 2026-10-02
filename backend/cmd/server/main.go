package main

import (
	"context"
	"log"

	"github.com/gin-gonic/gin"

	"github.com/hide199120/ally-study/backend/internal/config"
	"github.com/hide199120/ally-study/backend/internal/database"
	"github.com/hide199120/ally-study/backend/internal/handler"
)

func main() {
	cfg := config.Load()

	db, err := database.Open(context.Background(), cfg.DB)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	log.Printf("connected to MySQL at %s:%s/%s", cfg.DB.Host, cfg.DB.Port, cfg.DB.Name)

	r := gin.Default()

	// プロキシ経由のリクエストは今のところ想定しないので、どのプロキシも信用しない
	if err := r.SetTrustedProxies(nil); err != nil {
		log.Fatal(err)
	}

	health := &handler.HealthHandler{DB: db}

	// OpenAPIのベースパス（/api）に合わせてグループ化する
	api := r.Group("/api")
	api.GET("/health", health.Get)

	log.Printf("API server listening on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
