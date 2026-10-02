// Package config は環境変数からアプリの設定を読み込む。
package config

import (
	"os"
	"strconv"
)

// Config はアプリ全体の設定。
type Config struct {
	Port string
	DB   DBConfig
	// CookieSecure を true にすると、セッションCookieに Secure 属性を付ける（本番のHTTPS環境用）
	CookieSecure bool
}

// DBConfig はMySQLへの接続設定。
type DBConfig struct {
	Host     string
	Port     string
	Name     string
	User     string
	Password string
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
		},
		CookieSecure: getEnvBool("COOKIE_SECURE", false),
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
