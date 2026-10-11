package main

import (
	"context"
	"log"

	"github.com/gin-gonic/gin"

	"github.com/hide199120/ally-study/backend/internal/api"
	"github.com/hide199120/ally-study/backend/internal/config"
	"github.com/hide199120/ally-study/backend/internal/database"
	"github.com/hide199120/ally-study/backend/internal/handler"
	"github.com/hide199120/ally-study/backend/internal/repository"
	"github.com/hide199120/ally-study/backend/internal/service"
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

	// OpenAPI から生成したルーティングにハンドラーを登録する（ベースパスは /api）
	// 依存関係を組み立てる（repository → service → handler）
	auth := service.NewAuthService(
		&repository.UserRepository{DB: db},
		&repository.SessionRepository{DB: db},
	)
	room := service.NewRoomService(&repository.RoomRepository{DB: db})
	study := service.NewStudyService(&repository.StudyRepository{DB: db})
	server := &handler.Server{
		DB:     db,
		Auth:   auth,
		Room:   room,
		Study:  study,
		Cookie: handler.CookieConfig{Secure: cfg.CookieSecure},
	}
	api.RegisterHandlersWithOptions(r, server, api.GinServerOptions{BaseURL: "/api"})

	log.Printf("API server listening on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
