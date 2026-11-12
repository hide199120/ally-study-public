package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/hide199120/ally-study/backend/internal/api"
	"github.com/hide199120/ally-study/backend/internal/model"
	"github.com/hide199120/ally-study/backend/internal/service"
)

// fakeAnalyticsService は受け取った値を覚えておく、テスト用の AnalyticsService。
type fakeAnalyticsService struct {
	err    error
	events []model.AnalyticsEvent // Export で返すイベント

	called    bool
	gotUserID *int64
	gotBatch  model.AnalyticsBatch
	gotFrom   string
	gotTo     string

	unlinked  []int64 // UnlinkUser に渡されたユーザーID
	unlinkErr error
}

func (f *fakeAnalyticsService) Record(_ context.Context, userID *int64, batch model.AnalyticsBatch) error {
	f.called = true
	f.gotUserID = userID
	f.gotBatch = batch
	return f.err
}

func (f *fakeAnalyticsService) Daily(_ context.Context, from, to string) ([]model.AnalyticsDailyRow, error) {
	f.called = true
	f.gotFrom, f.gotTo = from, to
	if f.err != nil {
		return nil, f.err
	}
	return []model.AnalyticsDailyRow{{Date: "2026-10-01", Name: "page_leave", Events: 5, Visitors: 3, DurationSec: 1800}}, nil
}

func (f *fakeAnalyticsService) Export(_ context.Context, from, to string, fn func(model.AnalyticsEvent) error) error {
	f.called = true
	f.gotFrom, f.gotTo = from, to
	if f.err != nil {
		return f.err
	}
	for _, e := range f.events {
		if err := fn(e); err != nil {
			return err
		}
	}
	return nil
}

func (f *fakeAnalyticsService) UnlinkUser(_ context.Context, userID int64) error {
	f.unlinked = append(f.unlinked, userID)
	return f.unlinkErr
}

func analyticsServer(a *fakeAnalyticsService, admins ...int64) *Server {
	return &Server{
		Auth:         &fakeAuthService{user: testUser, validToken: "valid-token"},
		Analytics:    a,
		AdminUserIDs: admins,
	}
}

const validBatch = `{"anonymousId":"8f14e45f-ceea-467e-a2b3-0e5d1c3a9b71","device":"pc","events":[{"name":"page_view","properties":{"source":"x"}},{"name":"sound_play"}]}`

func TestServer_RecordAnalyticsEvents(t *testing.T) {
	t.Run("未ログインでも記録できる（ユーザーIDは nil）", func(t *testing.T) {
		a := &fakeAnalyticsService{}
		w := sendJSON(analyticsServer(a), http.MethodPost, "/api/analytics/events", "", validBatch)
		if w.Code != http.StatusNoContent {
			t.Fatalf("status = %d, body = %s", w.Code, w.Body.String())
		}
		if a.gotUserID != nil {
			t.Errorf("ユーザーIDは nil のはず: %v", *a.gotUserID)
		}
		if len(a.gotBatch.Events) != 2 || a.gotBatch.Events[0].Properties["source"] != "x" || a.gotBatch.Device != "pc" {
			t.Errorf("受け取ったイベントがおかしい: %+v", a.gotBatch)
		}
	})

	t.Run("ログイン中ならユーザーIDを付ける", func(t *testing.T) {
		a := &fakeAnalyticsService{}
		w := sendJSON(analyticsServer(a), http.MethodPost, "/api/analytics/events", "valid-token", validBatch)
		if w.Code != http.StatusNoContent {
			t.Fatalf("status = %d", w.Code)
		}
		if a.gotUserID == nil || *a.gotUserID != testUser.ID {
			t.Errorf("ユーザーID = %v", a.gotUserID)
		}
	})

	t.Run("セッションが切れていても、未ログインとして記録する", func(t *testing.T) {
		a := &fakeAnalyticsService{}
		w := sendJSON(analyticsServer(a), http.MethodPost, "/api/analytics/events", "expired-token", validBatch)
		if w.Code != http.StatusNoContent || a.gotUserID != nil {
			t.Errorf("status = %d, userID = %v", w.Code, a.gotUserID)
		}
	})

	for _, tt := range []struct{ name, body string }{
		{"知らないイベント名", `{"anonymousId":"8f14e45f-ceea-467e-a2b3-0e5d1c3a9b71","device":"pc","events":[{"name":"hack"}]}`},
		{"知らない端末", `{"anonymousId":"8f14e45f-ceea-467e-a2b3-0e5d1c3a9b71","device":"tv","events":[{"name":"page_view"}]}`},
		{"JSON が壊れている", `{"anonymousId":`},
	} {
		t.Run(tt.name+"は 400", func(t *testing.T) {
			a := &fakeAnalyticsService{}
			w := sendJSON(analyticsServer(a), http.MethodPost, "/api/analytics/events", "", tt.body)
			if w.Code != http.StatusBadRequest || errorCode(t, w) != "validation_error" {
				t.Errorf("status = %d, body = %s", w.Code, w.Body.String())
			}
			if a.called {
				t.Error("service は呼ばれないはず")
			}
		})
	}

	t.Run("service の入力チェックのエラーは 400", func(t *testing.T) {
		a := &fakeAnalyticsService{err: &service.ValidationError{Message: "匿名IDの形式が正しくありません"}}
		w := sendJSON(analyticsServer(a), http.MethodPost, "/api/analytics/events", "", validBatch)
		if w.Code != http.StatusBadRequest {
			t.Errorf("status = %d", w.Code)
		}
	})
}

func TestServer_GetAnalyticsDaily(t *testing.T) {
	const path = "/api/admin/analytics/daily?from=2026-10-01&to=2026-10-07"

	t.Run("管理者なら集計を返す", func(t *testing.T) {
		a := &fakeAnalyticsService{}
		w := doRequest(analyticsServer(a, testUser.ID), http.MethodGet, path, "valid-token")
		if w.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", w.Code, w.Body.String())
		}
		var got api.AnalyticsDaily
		if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
			t.Fatal(err)
		}
		if got.From != "2026-10-01" || got.To != "2026-10-07" || len(got.Rows) != 1 || got.Rows[0].Visitors != 3 || got.Rows[0].DurationSec != 1800 {
			t.Errorf("got %+v", got)
		}
		if a.gotFrom != "2026-10-01" || a.gotTo != "2026-10-07" {
			t.Errorf("期間 = %s〜%s", a.gotFrom, a.gotTo)
		}
	})

	for _, tt := range []struct {
		name   string
		admins []int64
		token  string
	}{
		{"ログインしていない", []int64{testUser.ID}, ""},
		{"管理者ではない", []int64{999}, "valid-token"},
		{"管理者が設定されていない", nil, "valid-token"},
	} {
		t.Run(tt.name+"なら 404", func(t *testing.T) {
			a := &fakeAnalyticsService{}
			w := doRequest(analyticsServer(a, tt.admins...), http.MethodGet, path, tt.token)
			if w.Code != http.StatusNotFound || errorCode(t, w) != "not_found" {
				t.Errorf("status = %d, body = %s", w.Code, w.Body.String())
			}
			if a.called {
				t.Error("service は呼ばれないはず")
			}
		})
	}

	t.Run("期間がないと 400（Error の形で返す）", func(t *testing.T) {
		w := doRequest(analyticsServer(&fakeAnalyticsService{}, testUser.ID), http.MethodGet, "/api/admin/analytics/daily?from=2026-10-01", "valid-token")
		if w.Code != http.StatusBadRequest || errorCode(t, w) != "validation_error" {
			t.Errorf("status = %d, body = %s", w.Code, w.Body.String())
		}
	})
}

func TestServer_ExportAnalyticsEvents(t *testing.T) {
	const path = "/api/admin/analytics/export?from=2026-10-01&to=2026-10-07"
	uid := int64(5)
	at := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)

	t.Run("1行に1件の JSON で返す", func(t *testing.T) {
		a := &fakeAnalyticsService{events: []model.AnalyticsEvent{
			{Name: "page_view", AnonymousID: "a", Device: "pc", Properties: []byte(`{"source":"x"}`), CreatedAt: at},
			{Name: "login", UserID: &uid, AnonymousID: "a", Device: "mobile", CreatedAt: at},
		}}
		w := doRequest(analyticsServer(a, testUser.ID), http.MethodGet, path, "valid-token")
		if w.Code != http.StatusOK {
			t.Fatalf("status = %d", w.Code)
		}
		if ct := w.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/x-ndjson") {
			t.Errorf("Content-Type = %s", ct)
		}
		if cd := w.Header().Get("Content-Disposition"); !strings.Contains(cd, "analytics_2026-10-01_2026-10-07.jsonl") {
			t.Errorf("Content-Disposition = %s", cd)
		}
		want := `{"name":"page_view","anonymousId":"a","userId":null,"device":"pc","properties":{"source":"x"},"createdAt":"2026-10-01T00:00:00Z"}` + "\n" +
			`{"name":"login","anonymousId":"a","userId":5,"device":"mobile","createdAt":"2026-10-01T00:00:00Z"}` + "\n"
		if w.Body.String() != want {
			t.Errorf("body =\n%s\nwant\n%s", w.Body.String(), want)
		}
	})

	t.Run("1件もなければ空で返す", func(t *testing.T) {
		w := doRequest(analyticsServer(&fakeAnalyticsService{}, testUser.ID), http.MethodGet, path, "valid-token")
		if w.Code != http.StatusOK || w.Body.Len() != 0 {
			t.Errorf("status = %d, body = %q", w.Code, w.Body.String())
		}
	})

	t.Run("期間の指定が正しくなければ 400", func(t *testing.T) {
		a := &fakeAnalyticsService{err: &service.ValidationError{Message: "期間は92日以内にしてください"}}
		w := doRequest(analyticsServer(a, testUser.ID), http.MethodGet, path, "valid-token")
		if w.Code != http.StatusBadRequest {
			t.Errorf("status = %d", w.Code)
		}
	})

	t.Run("管理者でなければ 404", func(t *testing.T) {
		w := doRequest(analyticsServer(&fakeAnalyticsService{}), http.MethodGet, path, "valid-token")
		if w.Code != http.StatusNotFound {
			t.Errorf("status = %d", w.Code)
		}
	})
}
