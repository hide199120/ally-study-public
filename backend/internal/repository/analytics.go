package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/hide199120/ally-study/backend/internal/model"
)

// analyticsTZOffsetHours は、日別に集計するときの時差（日本時間 = UTC+9）。
// 利用者のほとんどが日本にいる前提で、日付の区切りを日本時間に揃える。
const analyticsTZOffsetHours = 9

// maxExportRows は、1回の書き出しで返す行数の上限（無料枠を一度に使いすぎないように）。
const maxExportRows = 100000

// AnalyticsRepository は analytics_events テーブル（解析用の DB）を扱う。
type AnalyticsRepository struct {
	DB *sql.DB
}

// InsertEvents はイベントをまとめて保存する。1回の INSERT で複数行を入れて、DB とのやり取りを減らす。
func (r *AnalyticsRepository) InsertEvents(ctx context.Context, events []model.AnalyticsEvent) error {
	if len(events) == 0 {
		return nil
	}
	placeholders := make([]string, 0, len(events))
	args := make([]any, 0, len(events)*6)
	for _, e := range events {
		placeholders = append(placeholders, "(?, ?, ?, ?, ?, ?)")
		var props any
		if len(e.Properties) > 0 {
			props = string(e.Properties)
		}
		args = append(args, e.Name, e.UserID, e.AnonymousID, e.Device, props, e.CreatedAt)
	}
	query := `INSERT INTO analytics_events (event_name, user_id, anonymous_id, device, properties, created_at) VALUES ` +
		strings.Join(placeholders, ", ")
	if _, err := r.DB.ExecContext(ctx, query, args...); err != nil {
		return fmt.Errorf("insert analytics_events: %w", err)
	}
	return nil
}

// UnlinkUser は、そのユーザーのイベントから user_id を外す（NULL にする）。
// イベント自体は消さず、誰のものか分からない匿名のイベントとして残す（集計の数字が変わらないように）。
func (r *AnalyticsRepository) UnlinkUser(ctx context.Context, userID int64) error {
	if _, err := r.DB.ExecContext(ctx, `UPDATE analytics_events SET user_id = NULL WHERE user_id = ?`, userID); err != nil {
		return fmt.Errorf("unlink analytics_events: %w", err)
	}
	return nil
}

// Daily は [from, to) の期間（UTC）のイベントを、日付（日本時間）とイベント名ごとに集計する。
// 生ログを全件返さず、DB 側で数えた結果だけを返すので、読み出す量が少なくて済む。
func (r *AnalyticsRepository) Daily(ctx context.Context, from, to time.Time) ([]model.AnalyticsDailyRow, error) {
	query := fmt.Sprintf(`SELECT DATE(DATE_ADD(created_at, INTERVAL %d HOUR)) AS d, event_name,
		        COUNT(*), COUNT(DISTINCT anonymous_id),
		        COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(properties, '$.durationSec')) AS DECIMAL(12, 0))), 0)
		 FROM analytics_events
		 WHERE created_at >= ? AND created_at < ?
		 GROUP BY d, event_name
		 ORDER BY d, event_name`, analyticsTZOffsetHours)
	rows, err := r.DB.QueryContext(ctx, query, from, to)
	if err != nil {
		return nil, fmt.Errorf("select analytics daily: %w", err)
	}
	defer rows.Close()

	out := []model.AnalyticsDailyRow{}
	for rows.Next() {
		var date time.Time
		var row model.AnalyticsDailyRow
		if err := rows.Scan(&date, &row.Name, &row.Events, &row.Visitors, &row.DurationSec); err != nil {
			return nil, fmt.Errorf("scan analytics daily: %w", err)
		}
		row.Date = date.Format(model.DateLayout)
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate analytics daily: %w", err)
	}
	return out, nil
}

// Export は [from, to) の期間（UTC）のイベントを古い順に1件ずつ fn に渡す。
// 全件をメモリに載せずに、読んだそばから書き出せるようにしている。
func (r *AnalyticsRepository) Export(ctx context.Context, from, to time.Time, fn func(model.AnalyticsEvent) error) error {
	rows, err := r.DB.QueryContext(ctx,
		`SELECT event_name, user_id, anonymous_id, device, properties, created_at
		 FROM analytics_events
		 WHERE created_at >= ? AND created_at < ?
		 ORDER BY created_at, id
		 LIMIT ?`,
		from, to, maxExportRows,
	)
	if err != nil {
		return fmt.Errorf("select analytics events: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var e model.AnalyticsEvent
		var userID sql.NullInt64
		var props sql.NullString
		if err := rows.Scan(&e.Name, &userID, &e.AnonymousID, &e.Device, &props, &e.CreatedAt); err != nil {
			return fmt.Errorf("scan analytics events: %w", err)
		}
		if userID.Valid {
			e.UserID = &userID.Int64
		}
		if props.Valid {
			e.Properties = []byte(props.String)
		}
		if err := fn(e); err != nil {
			return err
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate analytics events: %w", err)
	}
	return nil
}
