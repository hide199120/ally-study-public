package handler

import (
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/hide199120/ally-study/backend/internal/api"
	"github.com/hide199120/ally-study/backend/internal/model"
	"github.com/hide199120/ally-study/backend/internal/service"
)

// SessionCookieName はセッションIDを入れるCookieの名前（OpenAPIの securitySchemes と同じ）。
const SessionCookieName = "session_id"

// Signup は POST /api/auth/signup を処理する。
func (s *Server) Signup(c *gin.Context) {
	var req api.SignupJSONRequestBody
	if err := c.ShouldBindJSON(&req); err != nil {
		errorJSON(c, http.StatusBadRequest, "validation_error", "リクエストの形式が正しくありません")
		return
	}

	user, sess, err := s.Auth.Signup(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		var ve *service.ValidationError
		switch {
		case errors.As(err, &ve):
			errorJSON(c, http.StatusBadRequest, "validation_error", ve.Message)
		case errors.Is(err, model.ErrUsernameTaken):
			errorJSON(c, http.StatusConflict, "username_taken", "このユーザー名はすでに使われています")
		default:
			log.Printf("signup: %v", err)
			errorJSON(c, http.StatusInternalServerError, "internal_error", "サーバーでエラーが発生しました")
		}
		return
	}

	s.setSessionCookie(c, sess)
	c.JSON(http.StatusCreated, toAPIUser(user))
}

// Login は POST /api/auth/login を処理する。
func (s *Server) Login(c *gin.Context) {
	var req api.LoginJSONRequestBody
	if err := c.ShouldBindJSON(&req); err != nil {
		errorJSON(c, http.StatusBadRequest, "validation_error", "リクエストの形式が正しくありません")
		return
	}

	user, sess, err := s.Auth.Login(c.Request.Context(), req.Username, req.Password)
	if errors.Is(err, service.ErrInvalidCredentials) {
		errorJSON(c, http.StatusUnauthorized, "invalid_credentials", "ユーザー名またはパスワードが正しくありません")
		return
	}
	if errors.Is(err, service.ErrTooManyAttempts) {
		errorJSON(c, http.StatusTooManyRequests, "too_many_requests", "ログインの失敗が続いたため、しばらくログインできません。時間をおいてお試しください")
		return
	}
	if err != nil {
		log.Printf("login: %v", err)
		errorJSON(c, http.StatusInternalServerError, "internal_error", "サーバーでエラーが発生しました")
		return
	}

	s.setSessionCookie(c, sess)
	c.JSON(http.StatusOK, toAPIUser(user))
}

// Logout は POST /api/auth/logout を処理する。
func (s *Server) Logout(c *gin.Context) {
	token, _, ok := s.requireUser(c)
	if !ok {
		return
	}

	if err := s.Auth.Logout(c.Request.Context(), token); err != nil {
		log.Printf("logout: %v", err)
		errorJSON(c, http.StatusInternalServerError, "internal_error", "サーバーでエラーが発生しました")
		return
	}

	s.clearSessionCookie(c)
	c.Status(http.StatusNoContent)
}

// GetMe は GET /api/me を処理する。
func (s *Server) GetMe(c *gin.Context) {
	_, user, ok := s.requireUser(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, toAPIUser(user))
}

// DeleteMe は DELETE /api/me を処理する（退会）。確認のためパスワードを受け取る。
func (s *Server) DeleteMe(c *gin.Context) {
	_, user, ok := s.requireUser(c)
	if !ok {
		return
	}
	var req api.DeleteAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Password == "" {
		errorJSON(c, http.StatusBadRequest, "validation_error", "パスワードを入力してください")
		return
	}

	err := s.Auth.DeleteAccount(c.Request.Context(), user, req.Password)
	if errors.Is(err, service.ErrWrongPassword) {
		errorJSON(c, http.StatusBadRequest, "wrong_password", "パスワードが正しくありません")
		return
	}
	if err != nil {
		log.Printf("delete account: %v", err)
		errorJSON(c, http.StatusInternalServerError, "internal_error", "サーバーでエラーが発生しました")
		return
	}

	// 解析イベントからユーザーIDを外す。解析用の DB は別のことがあるので、ユーザーの削除と同じトランザクションにはできない。
	// 失敗してもアカウントはもう消えているので、退会は成功として返し、ログに残す
	if err := s.Analytics.UnlinkUser(c.Request.Context(), user.ID); err != nil {
		log.Printf("unlink analytics user %d: %v", user.ID, err)
	}

	s.clearSessionCookie(c)
	c.Status(http.StatusNoContent)
}

// requireUser はCookieのセッションからログイン中のユーザーを取得する。
// ログインしていなければ 401 を返して ok=false になる（呼び出し側はそのまま return する）。
func (s *Server) requireUser(c *gin.Context) (token string, user *model.User, ok bool) {
	token, _ = c.Cookie(SessionCookieName)

	user, err := s.Auth.Authenticate(c.Request.Context(), token)
	if errors.Is(err, service.ErrUnauthenticated) {
		errorJSON(c, http.StatusUnauthorized, "unauthorized", "ログインしてください")
		return "", nil, false
	}
	if err != nil {
		log.Printf("authenticate: %v", err)
		errorJSON(c, http.StatusInternalServerError, "internal_error", "サーバーでエラーが発生しました")
		return "", nil, false
	}
	return token, user, true
}

// setSessionCookie はセッショントークンを HttpOnly Cookie に入れて返す。
func (s *Server) setSessionCookie(c *gin.Context, sess *service.Session) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     SessionCookieName,
		Value:    sess.Token,
		Path:     "/",
		Expires:  sess.ExpiresAt,
		MaxAge:   int(time.Until(sess.ExpiresAt).Seconds()),
		HttpOnly: true, // JavaScript から読めないようにする（XSS対策）
		Secure:   s.Cookie.Secure,
		SameSite: http.SameSiteLaxMode, // 他サイトからのPOSTでは送られない（CSRF対策）
	})
}

// clearSessionCookie はセッションCookieを削除する（有効期限を過去にして上書きする）。
func (s *Server) clearSessionCookie(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   s.Cookie.Secure,
		SameSite: http.SameSiteLaxMode,
	})
}
