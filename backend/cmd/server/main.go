package main

import (
	"context"
	"log"
	"time"

	"github.com/hide199120/ally-study/backend/db"
	"github.com/hide199120/ally-study/backend/internal/config"
	"github.com/hide199120/ally-study/backend/internal/database"
	"github.com/hide199120/ally-study/backend/internal/handler"
	"github.com/hide199120/ally-study/backend/internal/repository"
	"github.com/hide199120/ally-study/backend/internal/router"
	"github.com/hide199120/ally-study/backend/internal/service"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	conn, err := database.Open(ctx, cfg.DB)
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()
	log.Printf("connected to MySQL at %s:%s/%s", cfg.DB.Host, cfg.DB.Port, cfg.DB.Name)

	// 本番では起動時にテーブルを作る・更新する（ローカルは docker compose の migrate コンテナが行う）
	if cfg.RunMigrations {
		if err := database.Migrate(ctx, conn, db.Migrations, "migrations"); err != nil {
			log.Fatal(err)
		}
	}

	// 依存関係を組み立てる（repository → service → handler）
	sessions := &repository.SessionRepository{DB: conn}
	auth := service.NewAuthService(&repository.UserRepository{DB: conn}, sessions)
	room := service.NewRoomService(&repository.RoomRepository{DB: conn})
	study := service.NewStudyService(&repository.StudyRepository{DB: conn})
	server := &handler.Server{
		DB:     conn,
		Auth:   auth,
		Room:   room,
		Study:  study,
		Cookie: handler.CookieConfig{Secure: cfg.CookieSecure},
	}

	// 期限切れのセッションを1時間ごとに掃除する
	go func() {
		for range time.Tick(time.Hour) {
			if n, err := sessions.DeleteExpired(ctx, time.Now().UTC()); err != nil {
				log.Printf("cleanup sessions: %v", err)
			} else if n > 0 {
				log.Printf("cleanup sessions: %d deleted", n)
			}
		}
	}()

	r, err := router.New(server, router.Options{
		Secure:         cfg.CookieSecure,
		StaticDir:      cfg.StaticDir,
		TrustedProxies: cfg.TrustedProxies,
		ClientIPHeader: cfg.ClientIPHeader,
	})
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("API server listening on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
