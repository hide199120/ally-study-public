// Package config は環境変数からアプリの設定を読み込む。
package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
)

// Config はアプリ全体の設定。
type Config struct {
	Port string
	DB   DBConfig
	// AnalyticsDB はアクセス解析のイベントを保存する DB。
	// 本番では本体と別のインスタンスにして、解析で無料枠を使い切っても本体が止まらないようにする。
	// ANALYTICS_DB_* を設定しなければ、本体と同じ DB を使う（ローカル開発用）
	AnalyticsDB DBConfig
	// AdminUserIDs は管理者のユーザーID（カンマ区切り）。解析の集計・書き出しの API を使える
	AdminUserIDs []int64
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
	// Release は本番（GIN_MODE=release）かどうか。本番では、危険な設定のまま起動しないように Validate で確認する
	Release bool
}

// devDBPassword は、DB_PASSWORD を設定しなかったときに使う開発用のパスワード（docker-compose.yml の初期値と同じ）。
const devDBPassword = "ally_password"

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
	db := DBConfig{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "3306"),
		Name:     getEnv("DB_NAME", "ally_study"),
		User:     getEnv("DB_USER", "ally"),
		Password: getEnv("DB_PASSWORD", devDBPassword),
		TLS:      getEnvBool("DB_TLS", false),
	}
	return Config{
		Port: getEnv("PORT", "8080"),
		DB:   db,
		AnalyticsDB: DBConfig{
			Host:     getEnv("ANALYTICS_DB_HOST", db.Host),
			Port:     getEnv("ANALYTICS_DB_PORT", db.Port),
			Name:     getEnv("ANALYTICS_DB_NAME", db.Name),
			User:     getEnv("ANALYTICS_DB_USER", db.User),
			Password: getEnv("ANALYTICS_DB_PASSWORD", db.Password),
			TLS:      getEnvBool("ANALYTICS_DB_TLS", db.TLS),
		},
		AdminUserIDs:   parseIDs(os.Getenv("ADMIN_USER_IDS")),
		CookieSecure:   getEnvBool("COOKIE_SECURE", false),
		StaticDir:      os.Getenv("STATIC_DIR"),
		TrustedProxies: splitList(os.Getenv("TRUSTED_PROXIES")),
		ClientIPHeader: os.Getenv("CLIENT_IP_HEADER"),
		RunMigrations:  getEnvBool("RUN_MIGRATIONS", false),
		Release:        os.Getenv("GIN_MODE") == "release",
	}
}

// Validate は、本番で危険な設定のまま起動しないように確認する。
// 本番では DB のパスワードを必ず設定する（未設定のまま、開発用の初期値で DB につながってしまうのを防ぐ）。
func (c Config) Validate() error {
	if !c.Release {
		return nil
	}
	if c.DB.Password == devDBPassword {
		return errors.New("DB_PASSWORD が未設定（開発用の初期値のまま）です。本番では必ず設定してください")
	}
	if c.AnalyticsDB.Password == devDBPassword {
		return errors.New("ANALYTICS_DB_PASSWORD が開発用の初期値のままです。本番では必ず設定してください")
	}
	return nil
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

// parseIDs はカンマ区切りの数字を ID のリストにする。数字でないものは無視する。
func parseIDs(v string) []int64 {
	var out []int64
	for _, s := range splitList(v) {
		if id, err := strconv.ParseInt(s, 10, 64); err == nil && id > 0 {
			out = append(out, id)
		}
	}
	return out
}
