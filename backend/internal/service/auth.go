// Package service はアプリの業務処理（バリデーション、ハッシュ化など）を担当する層。
package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/hide199120/ally-study/backend/internal/model"
)

// UserStore はユーザーの保存先（repository.UserRepository が満たす）。
type UserStore interface {
	Create(ctx context.Context, username, passwordHash string) (*model.User, error)
	FindByID(ctx context.Context, id int64) (*model.User, error)
	FindByUsername(ctx context.Context, username string) (*model.User, error)
}

// SessionStore はセッションの保存先（repository.SessionRepository が満たす）。
type SessionStore interface {
	Create(ctx context.Context, id string, userID int64, expiresAt time.Time) error
	FindUserID(ctx context.Context, id string, now time.Time) (int64, error)
	Delete(ctx context.Context, id string) error
}

// Session はクライアントに渡すセッション情報。Token は Cookie に入れる値。
type Session struct {
	Token     string
	ExpiresAt time.Time
}

// ValidationError は入力内容が不正なことを表す。Message は画面に表示できる文言。
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string { return e.Message }

var (
	// ErrInvalidCredentials はユーザー名かパスワードが違うことを表す（どちらが違うかは教えない）。
	ErrInvalidCredentials = errors.New("invalid username or password")
	// ErrUnauthenticated はログインしていない、またはセッションが切れていることを表す。
	ErrUnauthenticated = errors.New("unauthenticated")
)

// dummyPasswordHash は、存在しないユーザー名でログインされたときにも
// bcrypt の比較を1回行うためのハッシュ。処理時間の差から
// 「そのユーザー名が存在するか」を推測されないようにする。
var dummyPasswordHash = sync.OnceValue(func() []byte {
	h, _ := bcrypt.GenerateFromPassword([]byte("dummy-password-for-timing"), bcrypt.DefaultCost)
	return h
})

const (
	defaultSessionTTL = 7 * 24 * time.Hour
	passwordMinLen    = 8
	passwordMaxLen    = 72 // bcrypt が扱えるのは72バイトまで
	sessionTokenBytes = 32
)

var usernamePattern = regexp.MustCompile(`^[A-Za-z0-9_]{3,32}$`)

// AuthService は新規登録・ログインなどの認証処理を行う。
type AuthService struct {
	Users      UserStore
	Sessions   SessionStore
	SessionTTL time.Duration
	Now        func() time.Time // テストで時刻を固定できるように差し替え可能にしている
}

// NewAuthService は標準の設定で AuthService を作る。
func NewAuthService(users UserStore, sessions SessionStore) *AuthService {
	return &AuthService{
		Users:      users,
		Sessions:   sessions,
		SessionTTL: defaultSessionTTL,
		Now:        time.Now,
	}
}

// Signup はユーザーを作成し、そのままログイン状態にするためのセッションを発行する。
func (s *AuthService) Signup(ctx context.Context, username, password string) (*model.User, *Session, error) {
	if err := validateCredentials(username, password); err != nil {
		return nil, nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, nil, fmt.Errorf("hash password: %w", err)
	}

	user, err := s.Users.Create(ctx, username, string(hash))
	if err != nil {
		return nil, nil, err // model.ErrUsernameTaken はそのまま返す
	}

	sess, err := s.createSession(ctx, user.ID)
	if err != nil {
		return nil, nil, err
	}
	return user, sess, nil
}

// Login はユーザー名とパスワードを確認し、セッションを発行する。
func (s *AuthService) Login(ctx context.Context, username, password string) (*model.User, *Session, error) {
	user, err := s.Users.FindByUsername(ctx, username)
	if errors.Is(err, model.ErrNotFound) {
		_ = bcrypt.CompareHashAndPassword(dummyPasswordHash(), []byte(password))
		return nil, nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	sess, err := s.createSession(ctx, user.ID)
	if err != nil {
		return nil, nil, err
	}
	return user, sess, nil
}

// Authenticate はセッショントークンから、ログイン中のユーザーを取得する。
func (s *AuthService) Authenticate(ctx context.Context, token string) (*model.User, error) {
	if token == "" {
		return nil, ErrUnauthenticated
	}
	userID, err := s.Sessions.FindUserID(ctx, HashToken(token), s.Now().UTC())
	if errors.Is(err, model.ErrNotFound) {
		return nil, ErrUnauthenticated
	}
	if err != nil {
		return nil, err
	}

	user, err := s.Users.FindByID(ctx, userID)
	if errors.Is(err, model.ErrNotFound) {
		return nil, ErrUnauthenticated
	}
	return user, err
}

// Logout はセッションを削除する。
func (s *AuthService) Logout(ctx context.Context, token string) error {
	return s.Sessions.Delete(ctx, HashToken(token))
}

// createSession はランダムなトークンを作り、そのハッシュ値をDBに保存する。
func (s *AuthService) createSession(ctx context.Context, userID int64) (*Session, error) {
	buf := make([]byte, sessionTokenBytes)
	if _, err := rand.Read(buf); err != nil {
		return nil, fmt.Errorf("generate session token: %w", err)
	}
	token := base64.RawURLEncoding.EncodeToString(buf)
	expiresAt := s.Now().Add(s.SessionTTL).UTC()

	if err := s.Sessions.Create(ctx, HashToken(token), userID, expiresAt); err != nil {
		return nil, err
	}
	return &Session{Token: token, ExpiresAt: expiresAt}, nil
}

// HashToken はセッショントークンをDB保存用のハッシュ値（SHA-256の16進数）に変換する。
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func validateCredentials(username, password string) error {
	if !usernamePattern.MatchString(username) {
		return &ValidationError{Message: "ユーザー名は3〜32文字の半角英数字とアンダースコアで入力してください"}
	}
	if n := len(password); n < passwordMinLen || n > passwordMaxLen {
		return &ValidationError{Message: "パスワードは8〜72文字で入力してください"}
	}
	return nil
}
