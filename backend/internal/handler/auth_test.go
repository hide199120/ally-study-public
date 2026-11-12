package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/hide199120/ally-study/backend/internal/api"
	"github.com/hide199120/ally-study/backend/internal/model"
	"github.com/hide199120/ally-study/backend/internal/service"
)

// fakeAuthService は決まった結果を返す、テスト用の AuthService。
type fakeAuthService struct {
	user *model.User
	sess *service.Session
	err  error

	validToken    string // Authenticate で受け付けるトークン
	loggedOutWith string // Logout に渡されたトークン
	deletedWith   string // DeleteAccount に渡されたパスワード
	deleteErr     error
}

func (f *fakeAuthService) DeleteAccount(_ context.Context, _ *model.User, password string) error {
	f.deletedWith = password
	return f.deleteErr
}

func (f *fakeAuthService) Signup(context.Context, string, string) (*model.User, *service.Session, error) {
	return f.user, f.sess, f.err
}

func (f *fakeAuthService) Login(context.Context, string, string) (*model.User, *service.Session, error) {
	return f.user, f.sess, f.err
}

func (f *fakeAuthService) Authenticate(_ context.Context, token string) (*model.User, error) {
	if token == "" || token != f.validToken {
		return nil, service.ErrUnauthenticated
	}
	return f.user, nil
}

func (f *fakeAuthService) Logout(_ context.Context, token string) error {
	f.loggedOutWith = token
	return nil
}

var testUser = &model.User{ID: 1, Username: "ally_user", PasswordHash: "secret-hash", CreatedAt: time.Date(2026, 10, 3, 0, 0, 0, 0, time.UTC)}

// doRequest は（必要ならセッションCookieを付けて）リクエストを送る。
func doRequest(s *Server, method, path, sessionToken string) *httptest.ResponseRecorder {
	r := newTestRouter(s)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(method, path, nil)
	if sessionToken != "" {
		req.AddCookie(&http.Cookie{Name: SessionCookieName, Value: sessionToken})
	}
	r.ServeHTTP(w, req)
	return w
}

func postJSON(s *Server, path, body string) *httptest.ResponseRecorder {
	r := newTestRouter(s)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	return w
}

func TestServer_Signup_Success(t *testing.T) {
	createdAt := time.Date(2026, 10, 3, 0, 0, 0, 0, time.UTC)
	auth := &fakeAuthService{
		user: &model.User{ID: 1, Username: "ally_user", PasswordHash: "secret-hash", CreatedAt: createdAt},
		sess: &service.Session{Token: "test-token", ExpiresAt: time.Now().Add(7 * 24 * time.Hour)},
	}

	w := postJSON(&Server{Auth: auth}, "/api/auth/signup", `{"username":"ally_user","password":"password1234"}`)

	if w.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d (body: %s)", w.Code, http.StatusCreated, w.Body.String())
	}

	var got api.User
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatalf("レスポンスがJSONとして読めない: %v", err)
	}
	if got.Id != 1 || got.Username != "ally_user" {
		t.Fatalf("user = %+v", got)
	}
	if strings.Contains(w.Body.String(), "secret-hash") {
		t.Fatal("レスポンスにパスワードのハッシュが含まれている")
	}

	cookies := w.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("Cookieの数 = %d, want 1", len(cookies))
	}
	ck := cookies[0]
	if ck.Name != SessionCookieName || ck.Value != "test-token" {
		t.Fatalf("cookie = %s=%s", ck.Name, ck.Value)
	}
	if !ck.HttpOnly {
		t.Fatal("Cookieに HttpOnly が付いていない")
	}
	if ck.SameSite != http.SameSiteLaxMode {
		t.Fatalf("SameSite = %v, want Lax", ck.SameSite)
	}
}

func TestServer_Signup_Errors(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		authErr  error
		wantCode int
		wantErr  string
	}{
		{name: "JSONが壊れている", body: `{"username":`, wantCode: http.StatusBadRequest, wantErr: "validation_error"},
		{name: "入力内容が不正", body: `{"username":"a","password":"x"}`, authErr: &service.ValidationError{Message: "NG"}, wantCode: http.StatusBadRequest, wantErr: "validation_error"},
		{name: "ユーザー名が重複", body: `{"username":"ally_user","password":"password1234"}`, authErr: model.ErrUsernameTaken, wantCode: http.StatusConflict, wantErr: "username_taken"},
		{name: "想定外のエラー", body: `{"username":"ally_user","password":"password1234"}`, authErr: errors.New("db down"), wantCode: http.StatusInternalServerError, wantErr: "internal_error"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := postJSON(&Server{Auth: &fakeAuthService{err: tt.authErr}}, "/api/auth/signup", tt.body)

			if w.Code != tt.wantCode {
				t.Fatalf("status = %d, want %d", w.Code, tt.wantCode)
			}
			var got api.Error
			if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
				t.Fatalf("レスポンスがJSONとして読めない: %v", err)
			}
			if got.Code != tt.wantErr {
				t.Fatalf("code = %s, want %s", got.Code, tt.wantErr)
			}
			if len(w.Result().Cookies()) != 0 {
				t.Fatal("エラーなのにCookieが発行されている")
			}
		})
	}
}

func TestServer_Login(t *testing.T) {
	t.Run("成功すると200とセッションCookieを返す", func(t *testing.T) {
		auth := &fakeAuthService{user: testUser, sess: &service.Session{Token: "login-token", ExpiresAt: time.Now().Add(time.Hour)}}
		w := postJSON(&Server{Auth: auth}, "/api/auth/login", `{"username":"ally_user","password":"password1234"}`)

		if w.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", w.Code, http.StatusOK)
		}
		cookies := w.Result().Cookies()
		if len(cookies) != 1 || cookies[0].Value != "login-token" {
			t.Fatalf("cookies = %v", cookies)
		}
	})

	t.Run("ユーザー名かパスワードが違うと401", func(t *testing.T) {
		auth := &fakeAuthService{err: service.ErrInvalidCredentials}
		w := postJSON(&Server{Auth: auth}, "/api/auth/login", `{"username":"ally_user","password":"wrong"}`)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", w.Code, http.StatusUnauthorized)
		}
		if len(w.Result().Cookies()) != 0 {
			t.Fatal("ログイン失敗なのにCookieが発行されている")
		}
	})
}

func TestServer_GetMe(t *testing.T) {
	auth := &fakeAuthService{user: testUser, validToken: "valid-token"}

	t.Run("ログイン中ならユーザー情報を返す", func(t *testing.T) {
		w := doRequest(&Server{Auth: auth}, http.MethodGet, "/api/me", "valid-token")
		if w.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", w.Code, http.StatusOK)
		}
		var got api.User
		if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil || got.Username != "ally_user" {
			t.Fatalf("body = %s", w.Body.String())
		}
	})

	t.Run("Cookieがなければ401", func(t *testing.T) {
		w := doRequest(&Server{Auth: auth}, http.MethodGet, "/api/me", "")
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", w.Code, http.StatusUnauthorized)
		}
	})

	t.Run("不正なトークンなら401", func(t *testing.T) {
		w := doRequest(&Server{Auth: auth}, http.MethodGet, "/api/me", "invalid-token")
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", w.Code, http.StatusUnauthorized)
		}
	})
}

func TestServer_Logout(t *testing.T) {
	t.Run("ログイン中なら204を返し、セッションとCookieを削除する", func(t *testing.T) {
		auth := &fakeAuthService{user: testUser, validToken: "valid-token"}
		w := doRequest(&Server{Auth: auth}, http.MethodPost, "/api/auth/logout", "valid-token")

		if w.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", w.Code, http.StatusNoContent)
		}
		if auth.loggedOutWith != "valid-token" {
			t.Fatalf("Logout に渡されたトークン = %q", auth.loggedOutWith)
		}
		cookies := w.Result().Cookies()
		if len(cookies) != 1 || cookies[0].Name != SessionCookieName || cookies[0].MaxAge >= 0 {
			t.Fatalf("Cookieが削除されていない: %v", cookies)
		}
	})

	t.Run("ログインしていなければ401", func(t *testing.T) {
		auth := &fakeAuthService{validToken: "valid-token"}
		w := doRequest(&Server{Auth: auth}, http.MethodPost, "/api/auth/logout", "")
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", w.Code, http.StatusUnauthorized)
		}
	})
}

func deleteJSON(s *Server, path, token, body string) *httptest.ResponseRecorder {
	r := newTestRouter(s)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodDelete, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: SessionCookieName, Value: token})
	r.ServeHTTP(w, req)
	return w
}

func TestServer_DeleteMe(t *testing.T) {
	t.Run("パスワードが合えば削除して Cookie を消す", func(t *testing.T) {
		auth := &fakeAuthService{user: testUser, validToken: "valid-token"}
		analytics := &fakeAnalyticsService{}
		w := deleteJSON(&Server{Auth: auth, Analytics: analytics}, "/api/me", "valid-token", `{"password":"password1234"}`)
		if w.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204", w.Code)
		}
		if len(analytics.unlinked) != 1 || analytics.unlinked[0] != testUser.ID {
			t.Errorf("解析イベントから外したユーザーID = %v, want [%d]", analytics.unlinked, testUser.ID)
		}
		if auth.deletedWith != "password1234" {
			t.Errorf("DeleteAccount に渡したパスワード = %q", auth.deletedWith)
		}
		if !strings.Contains(w.Header().Get("Set-Cookie"), "Max-Age=0") {
			t.Errorf("Cookie を消していない: %q", w.Header().Get("Set-Cookie"))
		}
	})
	t.Run("解析イベントの紐づけを外せなくても、退会は成功する", func(t *testing.T) {
		auth := &fakeAuthService{user: testUser, validToken: "valid-token"}
		analytics := &fakeAnalyticsService{unlinkErr: errors.New("analytics db down")}
		w := deleteJSON(&Server{Auth: auth, Analytics: analytics}, "/api/me", "valid-token", `{"password":"password1234"}`)
		if w.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204", w.Code)
		}
	})
	t.Run("パスワードが違えば、解析イベントには触らない", func(t *testing.T) {
		auth := &fakeAuthService{user: testUser, validToken: "valid-token", deleteErr: service.ErrWrongPassword}
		analytics := &fakeAnalyticsService{}
		w := deleteJSON(&Server{Auth: auth, Analytics: analytics}, "/api/me", "valid-token", `{"password":"nope"}`)
		if w.Code != http.StatusBadRequest || len(analytics.unlinked) != 0 {
			t.Fatalf("status = %d, unlinked = %v", w.Code, analytics.unlinked)
		}
	})
	t.Run("パスワードが違えば 400", func(t *testing.T) {
		auth := &fakeAuthService{user: testUser, validToken: "valid-token", deleteErr: service.ErrWrongPassword}
		w := deleteJSON(&Server{Auth: auth}, "/api/me", "valid-token", `{"password":"nope"}`)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", w.Code)
		}
	})
	t.Run("パスワードが空なら 400", func(t *testing.T) {
		auth := &fakeAuthService{user: testUser, validToken: "valid-token"}
		w := deleteJSON(&Server{Auth: auth}, "/api/me", "valid-token", `{}`)
		if w.Code != http.StatusBadRequest || auth.deletedWith != "" {
			t.Fatalf("status = %d, deleted = %q", w.Code, auth.deletedWith)
		}
	})
	t.Run("ログインしていなければ 401", func(t *testing.T) {
		w := deleteJSON(&Server{Auth: &fakeAuthService{}}, "/api/me", "", `{"password":"x"}`)
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want 401", w.Code)
		}
	})
}
