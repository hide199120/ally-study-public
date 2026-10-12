package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/hide199120/ally-study/backend/internal/model"
)

// SessionRepository は sessions テーブルを扱う。
type SessionRepository struct {
	DB *sql.DB
}

// Create はセッションを保存する。id にはトークンのハッシュ値を渡す。
func (r *SessionRepository) Create(ctx context.Context, id string, userID int64, expiresAt time.Time) error {
	_, err := r.DB.ExecContext(ctx,
		`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
		id, userID, expiresAt,
	)
	if err != nil {
		return fmt.Errorf("insert session: %w", err)
	}
	return nil
}

// FindUserID は有効期限内のセッションから user_id を取得する。
// 見つからない・期限切れの場合は model.ErrNotFound を返す。
func (r *SessionRepository) FindUserID(ctx context.Context, id string, now time.Time) (int64, error) {
	var userID int64
	err := r.DB.QueryRowContext(ctx,
		`SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?`, id, now,
	).Scan(&userID)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, model.ErrNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("select session: %w", err)
	}
	return userID, nil
}

// Delete はセッションを削除する。存在しなくてもエラーにはしない。
func (r *SessionRepository) Delete(ctx context.Context, id string) error {
	if _, err := r.DB.ExecContext(ctx, `DELETE FROM sessions WHERE id = ?`, id); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

// DeleteExpired は期限切れのセッションをまとめて削除し、消した件数を返す。
func (r *SessionRepository) DeleteExpired(ctx context.Context, now time.Time) (int64, error) {
	res, err := r.DB.ExecContext(ctx, `DELETE FROM sessions WHERE expires_at <= ?`, now)
	if err != nil {
		return 0, fmt.Errorf("delete expired sessions: %w", err)
	}
	return res.RowsAffected()
}
