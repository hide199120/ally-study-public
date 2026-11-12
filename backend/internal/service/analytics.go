package service

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"time"

	"github.com/hide199120/ally-study/backend/internal/model"
)

const (
	// 1回で送れるイベントの数（フロントはためてからまとめて送る）
	maxAnalyticsEvents = 20
	// 1件の追加情報（JSON）の大きさの上限
	maxAnalyticsPropertiesBytes = 1024
	// 集計・書き出しできる期間の上限（約3か月）
	maxAnalyticsRangeDays = 92
	// properties.durationSec（滞在時間・再生時間）の上限（1週間）
	maxAnalyticsDurationSec = 7 * 24 * 60 * 60
)

// jst は集計の日付の区切りに使う日本時間。
// サーバーにタイムゾーンのデータがなくても動くように、固定の時差で作る。
var jst = time.FixedZone("JST", 9*60*60)

// anonymousIDPattern はブラウザの crypto.randomUUID() が作る形（小文字の UUID）。
var anonymousIDPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// AnalyticsStore はアクセス解析のイベントの保存先（repository.AnalyticsRepository が満たす）。
type AnalyticsStore interface {
	InsertEvents(ctx context.Context, events []model.AnalyticsEvent) error
	Daily(ctx context.Context, from, to time.Time) ([]model.AnalyticsDailyRow, error)
	Export(ctx context.Context, from, to time.Time, fn func(model.AnalyticsEvent) error) error
	UnlinkUser(ctx context.Context, userID int64) error
}

// AnalyticsService はアクセス解析（イベントの記録・日別の集計・生ログの書き出し）の処理を行う。
type AnalyticsService struct {
	store AnalyticsStore
	now   func() time.Time
}

// NewAnalyticsService は AnalyticsService を作る。
func NewAnalyticsService(store AnalyticsStore) *AnalyticsService {
	return &AnalyticsService{store: store, now: time.Now}
}

// Record はフロントから送られてきたイベントを保存する。
// ユーザーIDと時刻はサーバー側で付ける（フロントから偽れないように）。userID は未ログインなら nil。
// イベント名と端末の種類が正しいかは、handler で OpenAPI の enum と照らし合わせて確認済みの前提。
func (s *AnalyticsService) Record(ctx context.Context, userID *int64, batch model.AnalyticsBatch) error {
	if !anonymousIDPattern.MatchString(batch.AnonymousID) {
		return &ValidationError{Message: "匿名IDの形式が正しくありません"}
	}
	if len(batch.Events) == 0 || len(batch.Events) > maxAnalyticsEvents {
		return &ValidationError{Message: fmt.Sprintf("イベントは1〜%d件で送ってください", maxAnalyticsEvents)}
	}

	now := s.now().UTC()
	events := make([]model.AnalyticsEvent, 0, len(batch.Events))
	for _, in := range batch.Events {
		var props json.RawMessage
		if len(in.Properties) > 0 {
			// 集計で合計する値なので、数として正しいかを確かめておく
			if d, ok := in.Properties["durationSec"]; ok {
				n, isNum := d.(float64)
				if !isNum || n < 0 || n > maxAnalyticsDurationSec {
					return &ValidationError{Message: "durationSec は0以上の秒数で送ってください"}
				}
			}
			b, err := json.Marshal(in.Properties)
			if err != nil {
				return &ValidationError{Message: "追加情報の形式が正しくありません"}
			}
			if len(b) > maxAnalyticsPropertiesBytes {
				return &ValidationError{Message: "追加情報が大きすぎます"}
			}
			props = b
		}
		events = append(events, model.AnalyticsEvent{
			Name:        in.Name,
			UserID:      userID,
			AnonymousID: batch.AnonymousID,
			Device:      batch.Device,
			Properties:  props,
			CreatedAt:   now,
		})
	}
	if err := s.store.InsertEvents(ctx, events); err != nil {
		return fmt.Errorf("insert events: %w", err)
	}
	return nil
}

// UnlinkUser は、退会したユーザーのイベントからユーザーIDを外す（イベントは匿名のまま残る）。
func (s *AnalyticsService) UnlinkUser(ctx context.Context, userID int64) error {
	if err := s.store.UnlinkUser(ctx, userID); err != nil {
		return fmt.Errorf("unlink user: %w", err)
	}
	return nil
}

// Daily は from〜to（日本時間の日付、両端を含む）の日別の集計を返す。
func (s *AnalyticsService) Daily(ctx context.Context, from, to string) ([]model.AnalyticsDailyRow, error) {
	start, end, err := analyticsRange(from, to)
	if err != nil {
		return nil, err
	}
	rows, err := s.store.Daily(ctx, start, end)
	if err != nil {
		return nil, fmt.Errorf("daily: %w", err)
	}
	return rows, nil
}

// Export は from〜to（日本時間の日付、両端を含む）のイベントを古い順に fn に渡す。
func (s *AnalyticsService) Export(ctx context.Context, from, to string, fn func(model.AnalyticsEvent) error) error {
	start, end, err := analyticsRange(from, to)
	if err != nil {
		return err
	}
	return s.store.Export(ctx, start, end, fn)
}

// analyticsRange は日本時間の日付 from〜to（両端を含む）を、UTC の [start, end) に変換する。
func analyticsRange(from, to string) (time.Time, time.Time, error) {
	f, err := time.ParseInLocation(model.DateLayout, from, jst)
	if err != nil {
		return time.Time{}, time.Time{}, &ValidationError{Message: "開始日の形式が正しくありません"}
	}
	t, err := time.ParseInLocation(model.DateLayout, to, jst)
	if err != nil {
		return time.Time{}, time.Time{}, &ValidationError{Message: "終了日の形式が正しくありません"}
	}
	if t.Before(f) {
		return time.Time{}, time.Time{}, &ValidationError{Message: "終了日は開始日以降にしてください"}
	}
	end := t.AddDate(0, 0, 1)
	if end.Sub(f) > maxAnalyticsRangeDays*24*time.Hour {
		return time.Time{}, time.Time{}, &ValidationError{Message: fmt.Sprintf("期間は%d日以内にしてください", maxAnalyticsRangeDays)}
	}
	return f.UTC(), end.UTC(), nil
}
