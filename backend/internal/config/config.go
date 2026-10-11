// Package config は環境変数からアプリの設定を読み込む。
package config

import (
	"os"
	"strconv"
	"strings"
)

// Config はアプリ全体の設定。
type Config struct {
	Port string
	DB   DBConfig
	// CookieSecure を true にすると、セッションCookieに Secure 属性を付け、HSTS ヘッダーも返す（本番のHTTPS環境用）
	CookieSecure bool
	// StaticDir にビルドしたフロントを置くと、API と同じサーバーから配る（本番用）
	StaticDir string
	// TrustedProxies は前に立つプロキシの IP 範囲（カンマ区切り）。ここからの X-Forwarded-For だけ信用する
	TrustedProxies []string
	// ClientIPHeader は接続元の IP が入るヘッダー（ホスティングが必ず上書きするもの。例：CF-Connecting-IP）
	ClientIPHeader string
	// RunMigrations を true にすると、起動時にマイグレーションを適用する（本番用）
	RunMigrations bool
}

// DBConfig はMySQLへの接続設定。
type DBConfig struct {
	Host     string
	Port     string
	Name     string
	User     string
	Password string
	// TLS を true にすると、DB との通信を暗号化する（クラウドの DB を使うとき）
	TLS bool
}

// Load は環境変数から設定を読み込む。未設定の項目はローカル開発用の値になる。
func Load() Config {
	return Config{
		Port: getEnv("PORT", "8080"),
		DB: DBConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "3306"),
			Name:     getEnv("DB_NAME", "ally_study"),
			User:     getEnv("DB_USER", "ally"),
			Password: getEnv("DB_PASSWORD", "ally_password"),
			TLS:      getEnvBool("DB_TLS", false),
		},
		CookieSecure:   getEnvBool("COOKIE_SECURE", false),
		StaticDir:      os.Getenv("STATIC_DIR"),
		TrustedProxies: splitList(os.Getenv("TRUSTED_PROXIES")),
		ClientIPHeader: os.Getenv("CLIENT_IP_HEADER"),
		RunMigrations:  getEnvBool("RUN_MIGRATIONS", false),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	v, err := strconv.ParseBool(os.Getenv(key))
	if err != nil {
		return fallback
	}
	return v
}

// splitList はカンマ区切りの文字列を、空白を取りのぞいたリストにする。空なら nil。
func splitList(v string) []string {
	var out []string
	for _, s := range strings.Split(v, ",") {
		if s = strings.TrimSpace(s); s != "" {
			out = append(out, s)
		}
	}
	return out
}
