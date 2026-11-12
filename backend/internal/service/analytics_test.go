package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/hide199120/ally-study/backend/internal/model"
)

// fakeAnalyticsStore は受け取った値を覚えておく、テスト用の保存先。
type fakeAnalyticsStore struct {
	inserted []model.AnalyticsEvent
	from, to time.Time
	unlinked []int64
	err      error
}

func (f *fakeAnalyticsStore) InsertEvents(_ context.Context, events []model.AnalyticsEvent) error {
	f.inserted = events
	return f.err
}

func (f *fakeAnalyticsStore) Daily(_ context.Context, from, to time.Time) ([]model.AnalyticsDailyRow, error) {
	f.from, f.to = from, to
	return []model.AnalyticsDailyRow{}, f.err
}

func (f *fakeAnalyticsStore) Export(_ context.Context, from, to time.Time, _ func(model.AnalyticsEvent) error) error {
	f.from, f.to = from, to
	return f.err
}

func (f *fakeAnalyticsStore) UnlinkUser(_ context.Context, userID int64) error {
	f.unlinked = append(f.unlinked, userID)
	return f.err
}

const testAnonID = "8f14e45f-ceea-467e-a2b3-0e5d1c3a9b71"

func TestAnalyticsService_Record(t *testing.T) {
	now := time.Date(2026, 10, 17, 9, 0, 0, 0, time.FixedZone("JST", 9*3600))
	userID := int64(7)

	t.Run("ユーザーIDと時刻はサーバー側で付ける", func(t *testing.T) {
		store := &fakeAnalyticsStore{}
		s := &AnalyticsService{store: store, now: func() time.Time { return now }}
		err := s.Record(context.Background(), &userID, model.AnalyticsBatch{
			AnonymousID: testAnonID,
			Device:      "pc",
			Events: []model.AnalyticsEventInput{
				{Name: "page_view", Properties: map[string]any{"source": "x"}},
				{Name: "sound_play"},
			},
		})
		if err != nil {
			t.Fatal(err)
		}
		if len(store.inserted) != 2 {
			t.Fatalf("保存した件数 = %d", len(store.inserted))
		}
		e := store.inserted[0]
		if *e.UserID != 7 || e.AnonymousID != testAnonID || e.Device != "pc" || !e.CreatedAt.Equal(now) || e.CreatedAt.Location() != time.UTC {
			t.Errorf("保存した内容がおかしい: %+v", e)
		}
		if string(e.Properties) != `{"source":"x"}` {
			t.Errorf("properties = %s", e.Properties)
		}
		if store.inserted[1].Properties != nil {
			t.Errorf("追加情報がなければ nil のはず: %s", store.inserted[1].Properties)
		}
	})

	tests := []struct {
		name  string
		batch model.AnalyticsBatch
	}{
		{"匿名IDの形式が違う", model.AnalyticsBatch{AnonymousID: "not-uuid", Device: "pc", Events: []model.AnalyticsEventInput{{Name: "page_view"}}}},
		{"イベントが0件", model.AnalyticsBatch{AnonymousID: testAnonID, Device: "pc"}},
		{"イベントが多すぎる", model.AnalyticsBatch{AnonymousID: testAnonID, Device: "pc", Events: make([]model.AnalyticsEventInput, 21)}},
		{"durationSec が数でない", model.AnalyticsBatch{AnonymousID: testAnonID, Device: "pc", Events: []model.AnalyticsEventInput{
			{Name: "page_leave", Properties: map[string]any{"durationSec": "10"}},
		}}},
		{"durationSec がマイナス", model.AnalyticsBatch{AnonymousID: testAnonID, Device: "pc", Events: []model.AnalyticsEventInput{
			{Name: "page_leave", Properties: map[string]any{"durationSec": -1.0}},
		}}},
		{"追加情報が大きすぎる", model.AnalyticsBatch{AnonymousID: testAnonID, Device: "pc", Events: []model.AnalyticsEventInput{
			{Name: "client_error", Properties: map[string]any{"message": strings.Repeat("a", 1100)}},
		}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := &fakeAnalyticsStore{}
			s := NewAnalyticsService(store)
			var ve *ValidationError
			if err := s.Record(context.Background(), nil, tt.batch); !errors.As(err, &ve) {
				t.Errorf("ValidationError のはず: %v", err)
			}
			if store.inserted != nil {
				t.Error("保存されていないはず")
			}
		})
	}
}

func TestAnalyticsService_UnlinkUser(t *testing.T) {
	t.Run("保存先に退会したユーザーのIDを渡す", func(t *testing.T) {
		store := &fakeAnalyticsStore{}
		if err := NewAnalyticsService(store).UnlinkUser(context.Background(), 7); err != nil {
			t.Fatal(err)
		}
		if len(store.unlinked) != 1 || store.unlinked[0] != 7 {
			t.Errorf("外したユーザーID = %v, want [7]", store.unlinked)
		}
	})

	t.Run("保存先のエラーはそのまま返す", func(t *testing.T) {
		boom := errors.New("db down")
		if err := NewAnalyticsService(&fakeAnalyticsStore{err: boom}).UnlinkUser(context.Background(), 7); !errors.Is(err, boom) {
			t.Errorf("err = %v, want %v", err, boom)
		}
	})
}

func TestAnalyticsService_Daily_Range(t *testing.T) {
	t.Run("日本時間の日付を UTC の期間にする", func(t *testing.T) {
		store := &fakeAnalyticsStore{}
		if _, err := NewAnalyticsService(store).Daily(context.Background(), "2026-10-01", "2026-10-07"); err != nil {
			t.Fatal(err)
		}
		wantFrom := time.Date(2026, 9, 30, 15, 0, 0, 0, time.UTC)
		wantTo := time.Date(2026, 10, 7, 15, 0, 0, 0, time.UTC)
		if !store.from.Equal(wantFrom) || !store.to.Equal(wantTo) {
			t.Errorf("期間 = %v〜%v, want %v〜%v", store.from, store.to, wantFrom, wantTo)
		}
	})

	for _, tt := range []struct{ name, from, to string }{
		{"日付の形式が違う", "2026/10/01", "2026-10-07"},
		{"終了日が開始日より前", "2026-10-07", "2026-10-01"},
		{"期間が長すぎる", "2026-01-01", "2026-12-31"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var ve *ValidationError
			if _, err := NewAnalyticsService(&fakeAnalyticsStore{}).Daily(context.Background(), tt.from, tt.to); !errors.As(err, &ve) {
				t.Errorf("ValidationError のはず: %v", err)
			}
		})
	}

	t.Run("92日ちょうどは OK", func(t *testing.T) {
		if _, err := NewAnalyticsService(&fakeAnalyticsStore{}).Daily(context.Background(), "2026-07-01", "2026-09-30"); err != nil {
			t.Errorf("エラーにならないはず: %v", err)
		}
	})
}
