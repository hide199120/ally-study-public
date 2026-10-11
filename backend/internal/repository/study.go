package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/hide199120/ally-study/backend/internal/model"
)

// StudyRepository は study_sessions / study_goals / study_settings テーブルを扱う。
type StudyRepository struct {
	DB *sql.DB
}

// AddSession は勉強した時間を1回分保存し、その日の合計（分）を返す。
func (r *StudyRepository) AddSession(ctx context.Context, userID int64, s model.StudySession) (int, error) {
	if _, err := r.DB.ExecContext(ctx,
		`INSERT INTO study_sessions (user_id, study_date, minutes, mode) VALUES (?, ?, ?, ?)`,
		userID, s.Date, s.Minutes, s.Mode,
	); err != nil {
		return 0, fmt.Errorf("insert study_sessions: %w", err)
	}

	var total int
	if err := r.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(minutes), 0) FROM study_sessions WHERE user_id = ? AND study_date = ?`,
		userID, s.Date,
	).Scan(&total); err != nil {
		return 0, fmt.Errorf("sum study_sessions: %w", err)
	}
	return total, nil
}

// DayStats はその日の勉強時間の合計（分）と記録の回数を返す。
func (r *StudyRepository) DayStats(ctx context.Context, userID int64, date string) (int, int, error) {
	var minutes, count int
	if err := r.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(minutes), 0), COUNT(*) FROM study_sessions WHERE user_id = ? AND study_date = ?`,
		userID, date,
	).Scan(&minutes, &count); err != nil {
		return 0, 0, fmt.Errorf("day stats: %w", err)
	}
	return minutes, count, nil
}

// DailyTotals は from（YYYY-MM-DD）以降の、日ごとの勉強時間の合計を日付の古い順に返す。
// 勉強していない日は含まない。
func (r *StudyRepository) DailyTotals(ctx context.Context, userID int64, from string) ([]model.StudyDay, error) {
	rows, err := r.DB.QueryContext(ctx,
		`SELECT study_date, SUM(minutes) FROM study_sessions
		 WHERE user_id = ? AND study_date >= ?
		 GROUP BY study_date ORDER BY study_date`,
		userID, from,
	)
	if err != nil {
		return nil, fmt.Errorf("select daily totals: %w", err)
	}
	defer rows.Close()

	days := []model.StudyDay{}
	for rows.Next() {
		var date time.Time
		var d model.StudyDay
		if err := rows.Scan(&date, &d.Minutes); err != nil {
			return nil, fmt.Errorf("scan daily totals: %w", err)
		}
		d.Date = date.Format(model.DateLayout)
		days = append(days, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate daily totals: %w", err)
	}
	return days, nil
}

// WeeklyGoal は週の目標時間（分）を返す。まだ保存していなければ model.ErrNotFound を返す。
func (r *StudyRepository) WeeklyGoal(ctx context.Context, userID int64) (int, error) {
	var minutes int
	err := r.DB.QueryRowContext(ctx,
		`SELECT weekly_goal_minutes FROM study_settings WHERE user_id = ?`, userID,
	).Scan(&minutes)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, model.ErrNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("select study_settings: %w", err)
	}
	return minutes, nil
}

// SaveWeeklyGoal は週の目標時間（分）を保存する。
func (r *StudyRepository) SaveWeeklyGoal(ctx context.Context, userID int64, minutes int) error {
	if _, err := r.DB.ExecContext(ctx,
		`INSERT INTO study_settings (user_id, weekly_goal_minutes) VALUES (?, ?)
		 ON DUPLICATE KEY UPDATE weekly_goal_minutes = VALUES(weekly_goal_minutes)`,
		userID, minutes,
	); err != nil {
		return fmt.Errorf("upsert study_settings: %w", err)
	}
	return nil
}

// Goals は目標の一覧を表示順で返す。
func (r *StudyRepository) Goals(ctx context.Context, userID int64) ([]model.StudyGoal, error) {
	rows, err := r.DB.QueryContext(ctx,
		`SELECT id, kind, title, due_date, done FROM study_goals WHERE user_id = ? ORDER BY position`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("select study_goals: %w", err)
	}
	defer rows.Close()

	goals := []model.StudyGoal{}
	for rows.Next() {
		var g model.StudyGoal
		var due sql.NullTime
		if err := rows.Scan(&g.ID, &g.Kind, &g.Title, &due, &g.Done); err != nil {
			return nil, fmt.Errorf("scan study_goals: %w", err)
		}
		if due.Valid {
			s := due.Time.Format(model.DateLayout)
			g.DueDate = &s
		}
		goals = append(goals, g)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate study_goals: %w", err)
	}
	return goals, nil
}

// SaveGoals は目標の一覧を丸ごと置き換えて保存する（1つのトランザクションで行う）。
func (r *StudyRepository) SaveGoals(ctx context.Context, userID int64, goals []model.StudyGoal) (err error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	if _, err = tx.ExecContext(ctx, `DELETE FROM study_goals WHERE user_id = ?`, userID); err != nil {
		return fmt.Errorf("delete study_goals: %w", err)
	}

	if len(goals) > 0 {
		placeholders := make([]string, 0, len(goals))
		args := make([]any, 0, len(goals)*7)
		for i, g := range goals {
			placeholders = append(placeholders, "(?, ?, ?, ?, ?, ?, ?)")
			var due any // 期限なしは NULL
			if g.DueDate != nil {
				due = *g.DueDate
			}
			args = append(args, userID, g.ID, i, g.Kind, g.Title, due, g.Done)
		}
		query := `INSERT INTO study_goals (user_id, id, position, kind, title, due_date, done) VALUES ` + strings.Join(placeholders, ", ")
		if _, err = tx.ExecContext(ctx, query, args...); err != nil {
			return fmt.Errorf("insert study_goals: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}
