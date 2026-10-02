// Package database はMySQLへの接続を扱う。
package database

import (
	"context"
	"database/sql"
	"fmt"
	"net"
	"time"

	"github.com/go-sql-driver/mysql"

	"github.com/hide199120/ally-study/backend/internal/config"
)

// Open はMySQLに接続し、疎通を確認してから *sql.DB を返す。
func Open(ctx context.Context, c config.DBConfig) (*sql.DB, error) {
	mc := mysql.NewConfig()
	mc.Net = "tcp"
	mc.Addr = net.JoinHostPort(c.Host, c.Port)
	mc.DBName = c.Name
	mc.User = c.User
	mc.Passwd = c.Password
	mc.ParseTime = true // DATETIME を time.Time として受け取る
	mc.Loc = time.UTC   // アプリとDBの間は UTC でやり取りする
	// DB側の CURRENT_TIMESTAMP も UTC になるように、接続ごとのタイムゾーンを揃える
	mc.Params = map[string]string{"time_zone": "'+00:00'"}

	db, err := sql.Open("mysql", mc.FormatDSN())
	if err != nil {
		return nil, fmt.Errorf("open mysql: %w", err)
	}

	// コネクションプールの設定
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping mysql: %w", err)
	}
	return db, nil
}
