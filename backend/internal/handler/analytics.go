package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"slices"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/hide199120/ally-study/backend/internal/api"
	"github.com/hide199120/ally-study/backend/internal/model"
	"github.com/hide199120/ally-study/backend/internal/service"
)

// RecordAnalyticsEvents は POST /api/analytics/events を処理する。
// ログインしていなくても記録する。記録に失敗しても画面の操作には関係ないので、フロントは結果を気にしない。
func (s *Server) RecordAnalyticsEvents(c *gin.Context) {
	var req api.RecordAnalyticsEventsJSONRequestBody
	if err := c.ShouldBindJSON(&req); err != nil {
		errorJSON(c, http.StatusBadRequest, "validation_error", "リクエストの形式が正しくありません")
		return
	}
	if !req.Device.Valid() {
		errorJSON(c, http.StatusBadRequest, "validation_error", "端末の種類が正しくありません")
		return
	}
	events := make([]model.AnalyticsEventInput, 0, len(req.Events))
	for _, e := range req.Events {
		if !e.Name.Valid() {
			errorJSON(c, http.StatusBadRequest, "validation_error", "イベントの種類が正しくありません")
			return
		}
		in := model.AnalyticsEventInput{Name: string(e.Name)}
		if e.Properties != nil {
			in.Properties = *e.Properties
		}
		events = append(events, in)
	}

	var userID *int64
	if user := s.optionalUser(c); user != nil {
		userID = &user.ID
	}

	err := s.Analytics.Record(c.Request.Context(), userID, model.AnalyticsBatch{
		AnonymousID: req.AnonymousId,
		Device:      string(req.Device),
		Events:      events,
	})
	if s.handleServiceError(c, "record analytics events", err) {
		return
	}
	c.Status(http.StatusNoContent)
}

// GetAnalyticsDaily は GET /api/admin/analytics/daily を処理する（管理者のみ）。
func (s *Server) GetAnalyticsDaily(c *gin.Context, params api.GetAnalyticsDailyParams) {
	if !s.requireAdmin(c) {
		return
	}

	rows, err := s.Analytics.Daily(c.Request.Context(), params.From, params.To)
	if s.handleServiceError(c, "analytics daily", err) {
		return
	}
	out := make([]api.AnalyticsDailyRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, api.AnalyticsDailyRow{Date: r.Date, Name: api.AnalyticsEventName(r.Name), Events: r.Events, Visitors: r.Visitors, DurationSec: r.DurationSec})
	}
	c.JSON(http.StatusOK, api.AnalyticsDaily{From: params.From, To: params.To, Rows: out})
}

// exportLine は書き出す1行の形（JSON Lines）。
type exportLine struct {
	Name        string          `json:"name"`
	AnonymousID string          `json:"anonymousId"`
	UserID      *int64          `json:"userId"`
	Device      string          `json:"device"`
	Properties  json.RawMessage `json:"properties,omitempty"`
	CreatedAt   time.Time       `json:"createdAt"`
}

// ExportAnalyticsEvents は GET /api/admin/analytics/export を処理する（管理者のみ）。
// 期間内のイベントを、1行に1件の JSON で返す。ダウンロードしてテキストエディタで読む用。
func (s *Server) ExportAnalyticsEvents(c *gin.Context, params api.ExportAnalyticsEventsParams) {
	if !s.requireAdmin(c) {
		return
	}

	// 1行目を書くまではエラーを JSON で返せるので、ヘッダーは最初の行を書くときに送る
	started := false
	enc := json.NewEncoder(c.Writer)
	err := s.Analytics.Export(c.Request.Context(), params.From, params.To, func(e model.AnalyticsEvent) error {
		if !started {
			startExport(c, params.From, params.To)
			started = true
		}
		return enc.Encode(exportLine{
			Name:        e.Name,
			AnonymousID: e.AnonymousID,
			UserID:      e.UserID,
			Device:      e.Device,
			Properties:  e.Properties,
			CreatedAt:   e.CreatedAt.UTC(),
		})
	})
	if started {
		// 途中まで書いてしまったので、ステータスは変えられない。ログにだけ残す
		if err != nil {
			log.Printf("export analytics events: %v", err)
		}
		return
	}
	if s.handleServiceError(c, "export analytics events", err) {
		return
	}
	// 1件もなかったときは、空のファイルを返す
	startExport(c, params.From, params.To)
}

func startExport(c *gin.Context, from, to string) {
	c.Header("Content-Type", "application/x-ndjson; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="analytics_%s_%s.jsonl"`, from, to))
	c.Header("Cache-Control", "no-store")
	c.Status(http.StatusOK)
	c.Writer.WriteHeaderNow()
}

// optionalUser はログイン中ならそのユーザーを、していなければ nil を返す（エラーのレスポンスは返さない）。
func (s *Server) optionalUser(c *gin.Context) *model.User {
	token, _ := c.Cookie(SessionCookieName)
	if token == "" {
		return nil
	}
	user, err := s.Auth.Authenticate(c.Request.Context(), token)
	if err != nil {
		if !errors.Is(err, service.ErrUnauthenticated) {
			log.Printf("authenticate (optional): %v", err)
		}
		return nil
	}
	return user
}

// requireAdmin は管理者なら true を返す。
// 管理者でなければ（ログインしていない場合も）、管理者向けの API があることを知られないように 404 を返す。
func (s *Server) requireAdmin(c *gin.Context) bool {
	token, _ := c.Cookie(SessionCookieName)
	user, err := s.Auth.Authenticate(c.Request.Context(), token)
	if err != nil && !errors.Is(err, service.ErrUnauthenticated) {
		log.Printf("authenticate (admin): %v", err)
		errorJSON(c, http.StatusInternalServerError, "internal_error", "サーバーでエラーが発生しました")
		return false
	}
	if user == nil || !slices.Contains(s.AdminUserIDs, user.ID) {
		errorJSON(c, http.StatusNotFound, "not_found", "見つかりません")
		return false
	}
	return true
}
