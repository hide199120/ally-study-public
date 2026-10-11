// Package handler はHTTPリクエストを受け取り、レスポンスを返す層。
package handler

import (
	"context"

	"github.com/gin-gonic/gin"

	"github.com/hide199120/ally-study/backend/internal/api"
	"github.com/hide199120/ally-study/backend/internal/model"
	"github.com/hide199120/ally-study/backend/internal/service"
)

// Pinger はDBへの疎通確認ができるもの（*sql.DB が満たす）。
// テストで偽物に差し替えられるようにインターフェースにしている。
type Pinger interface {
	PingContext(ctx context.Context) error
}

// AuthService は認証処理（service.AuthService が満たす）。
type AuthService interface {
	Signup(ctx context.Context, username, password string) (*model.User, *service.Session, error)
	Login(ctx context.Context, username, password string) (*model.User, *service.Session, error)
	Authenticate(ctx context.Context, token string) (*model.User, error)
	Logout(ctx context.Context, token string) error
}

// RoomService は部屋（模様替え）の処理（service.RoomService が満たす）。
type RoomService interface {
	Get(ctx context.Context, userID int64) (*model.Room, error)
	Update(ctx context.Context, userID int64, room *model.Room) (*model.Room, error)
}

// StudyService は学習記録の処理（service.StudyService が満たす）。
type StudyService interface {
	Overview(ctx context.Context, userID int64) (*model.StudyOverview, error)
	AddSession(ctx context.Context, userID int64, session model.StudySession) (*model.StudyDay, error)
	UpdateWeeklyGoal(ctx context.Context, userID int64, minutes int) error
	UpdateGoals(ctx context.Context, userID int64, goals []model.StudyGoal) ([]model.StudyGoal, error)
}

// CookieConfig はセッションCookieの設定。
type CookieConfig struct {
	// Secure を true にすると HTTPS のときだけ Cookie が送られる（本番では true にする）
	Secure bool
}

// Server は OpenAPI から生成した api.ServerInterface を実装する。
type Server struct {
	DB     Pinger
	Auth   AuthService
	Room   RoomService
	Study  StudyService
	Cookie CookieConfig
}

// OpenAPI のエンドポイントを実装し忘れたら、ここでコンパイルエラーになる
var _ api.ServerInterface = (*Server)(nil)

// errorJSON は OpenAPI で定義した Error の形でエラーを返す。
func errorJSON(c *gin.Context, status int, code, message string) {
	c.JSON(status, api.Error{Code: code, Message: message})
}

// toAPIUser はアプリ内の User を、APIのレスポンス用の形に変換する（パスワードのハッシュは含めない）。
func toAPIUser(u *model.User) api.User {
	return api.User{Id: u.ID, Username: u.Username, CreatedAt: u.CreatedAt}
}
