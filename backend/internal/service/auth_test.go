package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/hide199120/ally-study/backend/internal/model"
)

// fakeUserStore はメモリ上でユーザーを保存する、テスト用の UserStore。
type fakeUserStore struct {
	users map[string]*model.User
}

func newFakeUserStore() *fakeUserStore { return &fakeUserStore{users: map[string]*model.User{}} }

func (f *fakeUserStore) Create(_ context.Context, username, passwordHash string) (*model.User, error) {
	if _, ok := f.users[strings.ToLower(username)]; ok {
		return nil, model.ErrUsernameTaken
	}
	u := &model.User{ID: int64(len(f.users) + 1), Username: username, PasswordHash: passwordHash}
	f.users[strings.ToLower(username)] = u
	return u, nil
}

func (f *fakeUserStore) FindByID(_ context.Context, id int64) (*model.User, error) {
	for _, u := range f.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, model.ErrNotFound
}

func (f *fakeUserStore) FindByUsername(_ context.Context, username string) (*model.User, error) {
	if u, ok := f.users[strings.ToLower(username)]; ok {
		return u, nil
	}
	return nil, model.ErrNotFound
}

type savedSession struct {
	userID    int64
	expiresAt time.Time
}

// fakeSessionStore はメモリ上でセッションを保存する、テスト用の SessionStore。
type fakeSessionStore struct {
	sessions map[string]savedSession
}

func newFakeSessionStore() *fakeSessionStore {
	return &fakeSessionStore{sessions: map[string]savedSession{}}
}

func (f *fakeSessionStore) Create(_ context.Context, id string, userID int64, expiresAt time.Time) error {
	f.sessions[id] = savedSession{userID: userID, expiresAt: expiresAt}
	return nil
}

func (f *fakeSessionStore) FindUserID(_ context.Context, id string, now time.Time) (int64, error) {
	s, ok := f.sessions[id]
	if !ok || !s.expiresAt.After(now) {
		return 0, model.ErrNotFound
	}
	return s.userID, nil
}

func (f *fakeSessionStore) Delete(_ context.Context, id string) error {
	delete(f.sessions, id)
	return nil
}

func newTestAuthService() (*AuthService, *fakeUserStore, *fakeSessionStore) {
	users, sessions := newFakeUserStore(), newFakeSessionStore()
	s := NewAuthService(users, sessions)
	s.Now = func() time.Time { return time.Date(2026, 10, 3, 0, 0, 0, 0, time.UTC) }
	return s, users, sessions
}

func TestAuthService_Signup(t *testing.T) {
	s, users, sessions := newTestAuthService()

	user, sess, err := s.Signup(context.Background(), "ally_user", "password1234")
	if err != nil {
		t.Fatalf("Signup() error = %v", err)
	}

	t.Run("パスワードはハッシュ化して保存される", func(t *testing.T) {
		saved := users.users["ally_user"]
		if saved.PasswordHash == "password1234" {
			t.Fatal("パスワードが平文のまま保存されている")
		}
		if err := bcrypt.CompareHashAndPassword([]byte(saved.PasswordHash), []byte("password1234")); err != nil {
			t.Fatalf("保存されたハッシュが元のパスワードと一致しない: %v", err)
		}
	})

	t.Run("セッションはトークンのハッシュ値で保存される", func(t *testing.T) {
		if sess.Token == "" {
			t.Fatal("トークンが空")
		}
		if _, ok := sessions.sessions[sess.Token]; ok {
			t.Fatal("トークンがそのままDBに保存されている")
		}
		saved, ok := sessions.sessions[HashToken(sess.Token)]
		if !ok {
			t.Fatal("トークンのハッシュ値でセッションが保存されていない")
		}
		if saved.userID != user.ID {
			t.Fatalf("userID = %d, want %d", saved.userID, user.ID)
		}
	})

	t.Run("有効期限は7日後", func(t *testing.T) {
		want := time.Date(2026, 10, 10, 0, 0, 0, 0, time.UTC)
		if !sess.ExpiresAt.Equal(want) {
			t.Fatalf("ExpiresAt = %v, want %v", sess.ExpiresAt, want)
		}
	})
}

func TestAuthService_Signup_UsernameTaken(t *testing.T) {
	s, _, _ := newTestAuthService()
	ctx := context.Background()

	if _, _, err := s.Signup(ctx, "ally_user", "password1234"); err != nil {
		t.Fatalf("1回目の Signup() error = %v", err)
	}
	_, _, err := s.Signup(ctx, "ally_user", "password5678")
	if !errors.Is(err, model.ErrUsernameTaken) {
		t.Fatalf("error = %v, want %v", err, model.ErrUsernameTaken)
	}
}

func TestAuthService_Signup_Validation(t *testing.T) {
	tests := []struct {
		name     string
		username string
		password string
	}{
		{name: "ユーザー名が短すぎる", username: "ab", password: "password1234"},
		{name: "ユーザー名が長すぎる", username: strings.Repeat("a", 33), password: "password1234"},
		{name: "ユーザー名に使えない文字", username: "ally-user", password: "password1234"},
		{name: "ユーザー名が日本語", username: "ありー", password: "password1234"},
		{name: "パスワードが短すぎる", username: "ally_user", password: "short"},
		{name: "パスワードが長すぎる", username: "ally_user", password: strings.Repeat("a", 73)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s, _, _ := newTestAuthService()
			_, _, err := s.Signup(context.Background(), tt.username, tt.password)

			var ve *ValidationError
			if !errors.As(err, &ve) {
				t.Fatalf("error = %v, want ValidationError", err)
			}
		})
	}
}

func TestAuthService_Login(t *testing.T) {
	ctx := context.Background()
	s, _, _ := newTestAuthService()
	if _, _, err := s.Signup(ctx, "ally_user", "password1234"); err != nil {
		t.Fatalf("Signup() error = %v", err)
	}

	t.Run("正しいユーザー名とパスワードならログインできる", func(t *testing.T) {
		user, sess, err := s.Login(ctx, "ally_user", "password1234")
		if err != nil {
			t.Fatalf("Login() error = %v", err)
		}
		if user.Username != "ally_user" || sess.Token == "" {
			t.Fatalf("user = %+v, sess = %+v", user, sess)
		}
	})

	t.Run("パスワードが違う", func(t *testing.T) {
		_, _, err := s.Login(ctx, "ally_user", "wrong-password")
		if !errors.Is(err, ErrInvalidCredentials) {
			t.Fatalf("error = %v, want %v", err, ErrInvalidCredentials)
		}
	})

	t.Run("存在しないユーザー名でも同じエラーになる", func(t *testing.T) {
		_, _, err := s.Login(ctx, "nobody", "password1234")
		if !errors.Is(err, ErrInvalidCredentials) {
			t.Fatalf("error = %v, want %v", err, ErrInvalidCredentials)
		}
	})
}

func TestAuthService_AuthenticateAndLogout(t *testing.T) {
	ctx := context.Background()
	s, _, _ := newTestAuthService()
	_, sess, err := s.Signup(ctx, "ally_user", "password1234")
	if err != nil {
		t.Fatalf("Signup() error = %v", err)
	}

	t.Run("有効なトークンならユーザーを取得できる", func(t *testing.T) {
		user, err := s.Authenticate(ctx, sess.Token)
		if err != nil {
			t.Fatalf("Authenticate() error = %v", err)
		}
		if user.Username != "ally_user" {
			t.Fatalf("username = %s", user.Username)
		}
	})

	t.Run("トークンが空・不正なら未ログイン扱い", func(t *testing.T) {
		for _, token := range []string{"", "invalid-token"} {
			if _, err := s.Authenticate(ctx, token); !errors.Is(err, ErrUnauthenticated) {
				t.Fatalf("token=%q: error = %v, want %v", token, err, ErrUnauthenticated)
			}
		}
	})

	t.Run("有効期限を過ぎたら未ログイン扱い", func(t *testing.T) {
		original := s.Now
		defer func() { s.Now = original }()
		s.Now = func() time.Time { return original().Add(8 * 24 * time.Hour) }

		if _, err := s.Authenticate(ctx, sess.Token); !errors.Is(err, ErrUnauthenticated) {
			t.Fatalf("error = %v, want %v", err, ErrUnauthenticated)
		}
	})

	t.Run("ログアウトしたらそのトークンは使えない", func(t *testing.T) {
		if err := s.Logout(ctx, sess.Token); err != nil {
			t.Fatalf("Logout() error = %v", err)
		}
		if _, err := s.Authenticate(ctx, sess.Token); !errors.Is(err, ErrUnauthenticated) {
			t.Fatalf("error = %v, want %v", err, ErrUnauthenticated)
		}
	})
}
