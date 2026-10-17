package model

import (
	"encoding/json"
	"time"
)

// AnalyticsEvent はアクセス解析のイベント1件（analytics_events の1行）。
type AnalyticsEvent struct {
	Name        string          // page_view / sound_play など
	UserID      *int64          // ログイン中のユーザーID（未ログインなら nil）
	AnonymousID string          // ブラウザごとの匿名ID
	Device      string          // pc / mobile
	Properties  json.RawMessage // 追加情報の JSON（なければ nil）
	CreatedAt   time.Time       // 記録した時刻（UTC）
}

// AnalyticsEventInput はフロントから送られてきたイベント1件。
type AnalyticsEventInput struct {
	Name       string
	Properties map[string]any
}

// AnalyticsBatch はフロントから1回で送られてきたイベントのまとまり。
type AnalyticsBatch struct {
	AnonymousID string
	Device      string
	Events      []AnalyticsEventInput
}

// AnalyticsDailyRow は日付（日本時間）とイベントごとの集計。
type AnalyticsDailyRow struct {
	Date     string // YYYY-MM-DD
	Name     string
	Events   int // 件数
	Visitors int // 人数（匿名IDの数）
	// DurationSec は properties.durationSec の合計（滞在時間・再生時間。秒）
	DurationSec int
}
